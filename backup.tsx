import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Button,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Alert
} from 'react-native';
import io from 'socket.io-client';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

// const SOCKET_URL = "http://192.168.1.13:3000";
const SOCKET_URL = "http://147.79.71.200:6060";
const DEVICE_ID = "kitchen_printer_01";

export default function PrinterApp() {
  let printerprint={}
  const [socket, setSocket] = useState(null);
  const [socketStatus, setSocketStatus] = useState("Disconnected");
  const [pairedDevices, setPairedDevices] = useState([]);
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);
  const [lastPrintJob, setLastPrintJob] = useState(null);

  // Use ref for printer to avoid stale closure issues
  const selectedPrinterRef = useRef(null);

  // ========== 1. Load Paired Printers ==========
  const loadPrinters = async () => {
    try {
      const devices = await RNBluetoothClassic.getBondedDevices();
      console.log("Found devices:", devices.length);
      setPairedDevices(devices);
    } catch (e) {
      console.error("Error loading printers:", e);
      Alert.alert("Error", "Failed to load printers: " + e.message);
    }
  };

  // ========== 2. Connect to Selected Printer ==========
  const connectToPrinter = async (device) => {
    try {
      printerprint=device
      console.warn("Connecting to:", device.name);
  Alert.alert("Print Job", JSON.stringify(device)); // visible on device

      // Disconnect previous printer if any
      if (selectedPrinterRef.current && selectedPrinterRef.current.address !== device.address) {
        try {
          await selectedPrinterRef.current.disconnect();
        } catch (e) {
          console.log("Error disconnecting previous printer:", e);
        }
      }

      const connected = await device.connect();
      if (connected) {
        selectedPrinterRef.current = device;
        setIsPrinterConnected(true);

        // Test the connection
        await testConnection(device);

        Alert.alert("Success", `Connected to: ${device.name}`);

        // Register with server if socket is connected
        if (socket && socket.connected) {
          registerToServer(device);
        }
      }
    } catch (e) {
      console.error("Connection error:", e);
      Alert.alert("Connection Failed", e.message || "Failed to connect to printer");
    }
  };

  // Test the printer connection
  const testConnection = async (printer) => {
    try {
      console.log("Testing printer connection...");
      await printer.write([0x1B, 0x40, 0x1B, 0x61, 0x01, 0x1D, 0x21, 0x01]);
      await printer.write("Printer Test\n\n");
      await printer.write([0x1D, 0x21, 0x00, 0x1B, 0x61, 0x00]);
      await printer.write("Connection successful!\n\n\n\n");
      console.log("Test print sent successfully");
    } catch (error) {
      console.error("Test print error:", error);
      throw error;
    }
  };

  // ========== 3. Connect to SOCKET Server ==========
  const connectSocket = () => {
    console.log("Connecting to socket...");
    const s = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    s.on("connect", () => {
      console.log("✅ Socket connected, ID:", s.id);
      setSocketStatus("Connected");

      if (selectedPrinterRef.current && isPrinterConnected) {
        registerToServer(selectedPrinterRef.current);
      }
    });

    s.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error.message);
      setSocketStatus("Connection Error");
    });

    s.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
      setSocketStatus("Disconnected");
    });

    setSocket(s);
    return s;
  };

  // ========== 4. Socket print job listener ==========
  useEffect(() => {
    if (!socket) return;

    const handlePrintJob = async (job) => {
    
      console.log("📄 Print job received:", job);
      setLastPrintJob(job);

      const printer = selectedPrinterRef.current;
      if (!printer ) {
        Alert.alert("Print Error", "No printer connected.");
        return;
      }
      

      try {
        let connected = await printer.isConnected();
        if (!connected) {
          try {
            connected = await printer.connect();
            if (!connected) throw new Error("Failed to reconnect printer");
            setIsPrinterConnected(true);
          } catch (err) {
            Alert.alert("Print Error", "Printer disconnected and failed to reconnect.");
            return;
          }
        }

        console.log("🖨️ Starting print...");

        // ESC/POS commands
        await printer.write([0x1B, 0x40, 0x1B, 0x61, 0x01, 0x1D, 0x21, 0x01]);
        await printer.write("MY SHOP\n\n");
        await printer.write([0x1D, 0x21, 0x00, 0x1B, 0x61, 0x00]);

        // Print content safely
        if (job.content) {
          const lines = Array.isArray(job.content) ? job.content : [job.content];
          for (const line of lines) {
            await printer.write(String(line) + "\n");
          }
        } else if (job.items && Array.isArray(job.items)) {
          for (const item of job.items) {
            const name = item.name || "Item";
            const qty = item.quantity || 1;
            const price = item.price || "0.00";
            await printer.write(`${name} x${qty} - RM ${price}\n`);
          }
        }

        await printer.write("--------------------\n");
        if (job.total) await printer.write(`TOTAL: RM ${job.total}\n\n`);
        await printer.write("\n\n\n\n");
        await printer.write([0x1D, 0x56, 0x42, 0x00]); // Cut

        console.log("✅ Printed successfully");

        socket.emit("print_acknowledged", {
          deviceId: DEVICE_ID,
          jobId: job.jobId,
          status: "printed",
          timestamp: new Date().toISOString()
        });

        Alert.alert("Success", "Print job completed!");
      } catch (err) {
        console.error("❌ Print error:", err);
        Alert.alert("Print Failed", err.message || "Failed to print");

        socket.emit("print_acknowledged", {
          deviceId: DEVICE_ID,
          jobId: job.jobId,
          status: "failed",
          error: err.message
        });
      }
    };

    socket.on("print_job", handlePrintJob);
    return () => socket.off("print_job", handlePrintJob);
  }, [socket]);

  // ========== 5. Register printer to server ==========
  const registerToServer = (printer) => {
    if (!socket || !socket.connected) return;
    console.log("📡 Registering device to server...");
    socket.emit("register_device", {
      deviceId: DEVICE_ID,
      type: "thermal_printer",
      model: printer.name,
      address: printer.address,
      connected: true,
      timestamp: new Date().toISOString()
    });
  };

  // ========== 6. Manual test print ==========
  const manualTestPrint = async () => {
    const printer = selectedPrinterRef.current;
    if (!printer || !isPrinterConnected) {
      Alert.alert("Error", "No printer connected");
      return;
    }

    try {
      await printer.write([0x1B, 0x40, 0x1B, 0x61, 0x01, 0x1D, 0x21, 0x01]);
      await printer.write("TEST PRINT\n\n");
      await printer.write([0x1D, 0x21, 0x00, 0x1B, 0x61, 0x00]);
      await printer.write("Item 1: RM 10.00\n");
      await printer.write("Item 2: RM 5.00\n");
      await printer.write("--------------------\n");
      await printer.write("TOTAL: RM 15.00\n");
      await printer.write("\n\n\n");
      Alert.alert("Success", "Test print sent!");
    } catch (error) {
      Alert.alert("Error", "Test print failed: " + error.message);
    }
  };

  useEffect(() => {
    const s = connectSocket();
    loadPrinters();

    return () => {
      if (s) s.disconnect();
      if (selectedPrinterRef.current && isPrinterConnected) selectedPrinterRef.current.disconnect();
    };
  }, []);

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: '#f5f5f5' }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20, color: '#333' }}>
        Printer Dashboard
      </Text>

      {/* Status Indicators */}
      <View style={{ backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <View style={{
            width: 12, height: 12, borderRadius: 6,
            backgroundColor: socketStatus === "Connected" ? "#4CAF50" : "#f44336",
            marginRight: 10
          }} />
          <Text style={{ fontSize: 16 }}>Socket: <Text style={{ fontWeight: 'bold' }}>{socketStatus}</Text></Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{
            width: 12, height: 12, borderRadius: 6,
            backgroundColor: isPrinterConnected ? "#4CAF50" : "#f44336",
            marginRight: 10
          }} />
          <Text style={{ fontSize: 16 }}>
            Printer: <Text style={{ fontWeight: 'bold' }}>
              {isPrinterConnected ? "Connected" : "Disconnected"}
            </Text>
            {selectedPrinterRef.current && ` (${selectedPrinterRef.current.name})`}
          </Text>
        </View>
      </View>

      {/* Last Print Job */}
      {lastPrintJob && (
        <View style={{ backgroundColor: '#e3f2fd', padding: 15, borderRadius: 10, marginBottom: 15 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 5, color: '#1565c0' }}>
            Last Print Job:
          </Text>
          <ScrollView style={{ maxHeight: 120 }}>
            <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
              {JSON.stringify(lastPrintJob, null, 2)}
            </Text>
          </ScrollView>
        </View>
      )}

      {/* Available Printers */}
      <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 10, color: '#333' }}>Available Printers:</Text>
      {pairedDevices.length > 0 ? (
        <FlatList
          data={pairedDevices}
          keyExtractor={(item) => item.address}
          style={{ maxHeight: 200, marginBottom: 15 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => connectToPrinter(item)}
              style={{
                padding: 15,
                marginBottom: 8,
                backgroundColor: selectedPrinterRef.current?.address === item.address ? '#2196F3' : 'white',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#e0e0e0'
              }}
            >
              <Text style={{ 
                fontSize: 16, fontWeight: '500',
                color: selectedPrinterRef.current?.address === item.address ? 'white' : '#333' 
              }}>
                {item.name}
              </Text>
              <Text style={{ fontSize: 12, color: selectedPrinterRef.current?.address === item.address ? '#e3f2fd' : '#666', marginTop: 2 }}>
                {item.address}
              </Text>
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10, alignItems: 'center' }}>
          <Text style={{ color: '#666', marginBottom: 10 }}>No printers found</Text>
          <Button title="Refresh Printers" onPress={loadPrinters} />
        </View>
      )}

      {/* Action Buttons */}
      <View style={{ gap: 10, marginTop: 20 }}>
        <Button title="Refresh Printers" onPress={loadPrinters} color="#2196F3" />
        {isPrinterConnected && (
          <>
            <Button title="Test Print" onPress={manualTestPrint} color="#4CAF50" />
            <Button title="Disconnect Printer" onPress={async () => {
              try {
                await selectedPrinterRef.current.disconnect();
                selectedPrinterRef.current = null;
                setIsPrinterConnected(false);
                Alert.alert("Disconnected", "Printer disconnected successfully");
              } catch (e) {
                Alert.alert("Error", "Failed to disconnect: " + e.message);
              }
            }} color="#f44336" />
          </>
        )}
      </View>
    </View>
  );
}
