import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Button,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import io from 'socket.io-client';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = "http://147.79.71.200:6060";
const DEVICE_ID = "kitchen_printer_01";

// Navigation screens
const SCREENS = {
  PIN: 'PIN',
  JOBS: 'JOBS',
  SETTINGS: 'SETTINGS',
  PRINTERS: 'PRINTERS'
};

export default function PrinterApp() {
  const [socket, setSocket] = useState(null);
  const [socketStatus, setSocketStatus] = useState("Disconnected");
  const [pairedDevices, setPairedDevices] = useState([]);
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);
  const [lastPrintJob, setLastPrintJob] = useState(null);
  const [currentScreen, setCurrentScreen] = useState(SCREENS.PIN);
  const [pin, setPin] = useState('');
  const [savedPrinters, setSavedPrinters] = useState([]);
  const [printJobs, setPrintJobs] = useState({
    pending: [],
    completed: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState({
    autoConnect: true,
    autoPrint: true,
    paperWidth: 58,
    cutPaper: true
  });

  const selectedPrinterRef = useRef(null);
  const pinInputRef = useRef(null);

  // Load saved printers on app start
  useEffect(() => {
    loadSavedPrinters();
    loadSettings();
  }, []);

  // Load saved printers from AsyncStorage
  const loadSavedPrinters = async () => {
    try {
      const saved = await AsyncStorage.getItem('@saved_printers');
      if (saved) {
        const printers = JSON.parse(saved);
        setSavedPrinters(printers);
        
        // Auto-connect to first saved printer if enabled
        if (settings.autoConnect && printers.length > 0) {
          const device = printers[0];
          await connectToPrinter(device);
        }
      }
    } catch (error) {
      console.error("Error loading saved printers:", error);
    }
  };

  // Load settings
  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('@printer_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  // Save settings
  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('@printer_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
      Alert.alert("Success", "Settings saved successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to save settings");
    }
  };

  // Save printer to favorites
  const savePrinter = async (device) => {
    try {
      const updatedPrinters = [...savedPrinters];
      if (!updatedPrinters.find(p => p.address === device.address)) {
        updatedPrinters.push({
          name: device.name,
          address: device.address,
          savedAt: new Date().toISOString()
        });
        await AsyncStorage.setItem('@saved_printers', JSON.stringify(updatedPrinters));
        setSavedPrinters(updatedPrinters);
        Alert.alert("Success", "Printer saved to favorites!");
      } else {
        Alert.alert("Info", "Printer already saved");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to save printer");
    }
  };

  // Remove saved printer
  const removeSavedPrinter = async (address) => {
    try {
      const updatedPrinters = savedPrinters.filter(p => p.address !== address);
      await AsyncStorage.setItem('@saved_printers', JSON.stringify(updatedPrinters));
      setSavedPrinters(updatedPrinters);
      Alert.alert("Success", "Printer removed from favorites");
    } catch (error) {
      Alert.alert("Error", "Failed to remove printer");
    }
  };

  // PIN Verification
  const verifyPin = () => {
    // In production, use secure storage and hash comparison
    const correctPin = "123456"; // Default PIN, should be configurable
    if (pin === correctPin) {
      setCurrentScreen(SCREENS.JOBS);
      setPin('');
      Alert.alert("Success", "Access granted!");
    } else {
      Alert.alert("Error", "Invalid PIN. Please try again.");
    }
  };

  // Load paired devices
  const loadPrinters = async () => {
    try {
      setRefreshing(true);
      const devices = await RNBluetoothClassic.getBondedDevices();
      setPairedDevices(devices);
    } catch (e) {
      console.error("Error loading printers:", e);
      Alert.alert("Error", "Failed to load printers: " + e.message);
    } finally {
      setRefreshing(false);
    }
  };

  // Connect to printer
  const connectToPrinter = async (device) => {
    try {
      setIsLoading(true);
      
      // Disconnect previous printer
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
        
        // Test connection
        await testConnection(device);
        
        Alert.alert("Success", `Connected to: ${device.name}`);
        
        // Register with server
        if (socket && socket.connected) {
          registerToServer(device);
        }
      }
    } catch (e) {
      Alert.alert("Connection Failed", e.message || "Failed to connect to printer");
    } finally {
      setIsLoading(false);
    }
  };

  // Test printer connection
  const testConnection = async (printer) => {
    try {
      
      await printer.write("Connection successful!\n\n\n\n");
    } catch (error) {
      console.error("Test print error:", error);
      throw error;
    }
  };

  // Connect to socket server
  const connectSocket = () => {
    const s = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    s.on("connect", () => {
      setSocketStatus("Connected");
      
      if (selectedPrinterRef.current && isPrinterConnected) {
        registerToServer(selectedPrinterRef.current);
      }
      
      // Fetch print jobs when connected
      fetchPrintJobs();
    });

    s.on("connect_error", (error) => {
      setSocketStatus("Connection Error");
    });

    s.on("disconnect", (reason) => {
      setSocketStatus("Disconnected");
    });

    // Listen for print jobs
  s.on("print_job", async (rawJob) => {
  console.log("RAW JOB FROM SERVER:", rawJob);

  // normalize job for printer app
  const job = {
    jobId: rawJob.jobId || `JOB-${Date.now()}`,
    deviceId: rawJob.deviceId,
    items: rawJob.items || [],
    total: rawJob.total || 0,
    timestamp: rawJob.timestamp || new Date().toISOString(),
    status: "pending",
    shopname:rawJob.shopname,
    address:rawJob.address,
    contact:rawJob.contact,


  };

  handlePrintJob(job);
});


    // Listen for job updates
    s.on("job_update", (data) => {
      setPrintJobs(prev => ({
        ...prev,
        pending: data.pending || prev.pending,
        completed: data.completed || prev.completed
      }));
    });

    setSocket(s);
    return s;
  };

  const LINE_WIDTH = 32; // 58mm printer

const padRight = (text, length) =>
  text.length >= length ? text.slice(0, length) : text + " ".repeat(length - text.length);

const padLeft = (text, length) =>
  text.length >= length ? text.slice(0, length) : " ".repeat(length - text.length) + text;

const formatItemLine = (name, price, quantity = null) => {
  if (quantity !== null) {
    // First line: name + price
    const line1 = padRight(name, 22) + padLeft(price.toFixed(2), 10);
    // Second line: quantity
    const line2 = "Qty: " + quantity;
    return line1 + "\n" + line2;
  } else {
    // Single line (like TOTAL)
    return padRight(name, 22) + padLeft(price.toFixed(2), 10);
  }
};

/**
 * MAIN FORMATTER
 * Call this before printer.write()
 */
const formatReceipt = ({
  shopName = "Tek Sen Restaurant",
  contact = "+6011-2187 1318",
  address = "18, Lebuh Carnavon,\nGeorgetown, Pulau Pinang",
  items = [],
  total = 0,
  footer = "Thank you!"
}) => {
  let output = "";

  // Header
 // Header (LEFT aligned)
output += "\x1B\x61\x00";        // LEFT align

// Title / Custom detail (BIG + BOLD)
output += "\x1D\x21\x00";        // Normal size (single height)
output += "\x1B\x45\x01";        // Bold ON
output += `${shopName}\n`;
output += "\x1B\x45\x00";        // Bold OFF

// Normal text for contact & address
output += "\x1D\x21\x00";        // Normal size
output += `Contact: ${contact}\n`;
output += `Address: ${address}\n\n`;

  
  // Body
  output += "\x1B\x61\x00";        // Left align
  output += "--------------------------------\n";

  items.forEach(item => {
    output += formatItemLine(item.name, item.price, item.quantity) + "\n";
  });

  output += "--------------------------------\n";

  // Total (bold)
  output += "\x1B\x45\x01";        // Bold ON
  output += formatItemLine("TOTAL", total) + "\n";
  output += "\x1B\x45\x00";        // Bold OFF

  // Footer (center)
  output += "\x1B\x61\x01";
  output += "\n" + footer + "\n\n\n";

  return output;
};



  // Handle print job
  const handlePrintJob = async (job) => {

  setLastPrintJob(job);

  setPrintJobs(prev => ({
    ...prev,
    pending: [job, ...prev.pending]
  }));

  if (!settings.autoPrint) return;

  const printer = selectedPrinterRef.current;
  if (!printer) {
    Alert.alert("Print Error", "No printer connected");
    return;
  }

  try {
    let connected = await printer.isConnected();
    if (!connected) {
      connected = await printer.connect();
      if (!connected) throw new Error("Printer reconnect failed");
    }

    const receipt = formatReceipt({
      shopName: job.shopname,
      items: job.items,
      total: job.total,
      contact:job.contact,
      address:job.address,
      
      footer: "Powered by MVE POS"
    });

    await printer.write(receipt);
    await printer.write([0x1D, 0x56, 0x42, 0x00]); // CUT

    setPrintJobs(prev => ({
      pending: prev.pending.filter(j => j.jobId !== job.jobId),
      completed: [
        {
          ...job,
          status: "printed",
          printedAt: new Date().toISOString()
        },
        ...prev.completed
      ]
    }));

    socket?.emit("print_acknowledged", {
      deviceId: DEVICE_ID,
      jobId: job.jobId,
      status: "printed"
    });

  } catch (err) {
    console.error("PRINT ERROR:", err);

    socket?.emit("print_acknowledged", {
      deviceId: DEVICE_ID,
      jobId: job.jobId,
      status: "failed",
      error: err.message
    });

    Alert.alert("Print Failed", err.message);
  }
};


  // Fetch print jobs from server
  const fetchPrintJobs = async () => {
    if (!socket || !socket.connected) return;
    
    try {
      socket.emit("get_print_jobs", { deviceId: DEVICE_ID }, (response) => {
        if (response && response.jobs) {
          setPrintJobs(response.jobs);
        }
      });
    } catch (error) {
      console.error("Error fetching print jobs:", error);
    }
  };

  // Manually print a pending job
  const printPendingJob = async (job) => {
    await handlePrintJob(job);
  };

  // Register device to server
  const registerToServer = (printer) => {
    if (!socket || !socket.connected) return;
    
    socket.emit("register_device", {
      deviceId: DEVICE_ID,
      type: "thermal_printer",
      model: printer.name,
      address: printer.address,
      connected: true,
      timestamp: new Date().toISOString()
    });
  };

  // Initialize socket on mount
  useEffect(() => {
    const s = connectSocket();
    loadPrinters();

    return () => {
      if (s) s.disconnect();
      if (selectedPrinterRef.current && isPrinterConnected) {
        selectedPrinterRef.current.disconnect();
      }
    };
  }, []);

  // PIN Screen
  if (currentScreen === SCREENS.PIN) {
    return (
      <View style={styles.pinContainer}>
        <Text style={styles.pinTitle}>Enter 6-digit PIN</Text>
        <TextInput
          ref={pinInputRef}
          style={styles.pinInput}
          value={pin}
          onChangeText={setPin}
          keyboardType="numeric"
          maxLength={6}
          secureTextEntry
          autoFocus
        />
        <View style={styles.pinButtons}>
          <TouchableOpacity style={styles.pinButton} onPress={verifyPin}>
            <Text style={styles.pinButtonText}>Submit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.pinButton, styles.secondaryButton]}
            onPress={() => setCurrentScreen(SCREENS.SETTINGS)}
          >
            <Text style={styles.pinButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Main Navigation
  const renderScreen = () => {
    switch (currentScreen) {
      case SCREENS.JOBS:
        return (
          <ScrollView style={styles.screenContainer}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Print Jobs</Text>
              <TouchableOpacity onPress={fetchPrintJobs}>
                <Text style={styles.refreshText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {/* Status */}
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, socketStatus === "Connected" ? styles.connected : styles.disconnected]} />
                <Text>Socket: {socketStatus}</Text>
              </View>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, isPrinterConnected ? styles.connected : styles.disconnected]} />
                <Text>Printer: {isPrinterConnected ? "Connected" : "Disconnected"}</Text>
              </View>
            </View>

            {/* Pending Jobs */}
            <Text style={styles.sectionTitle}>Pending Jobs ({printJobs.pending.length})</Text>
            {printJobs.pending.length > 0 ? (
              <FlatList
                data={printJobs.pending}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View style={styles.jobCard}>
                    <Text style={styles.jobId}>Order #{item.jobId}</Text>
                    <Text style={styles.jobTime}>
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </Text>
                    {item.items && (
                      <Text style={styles.jobItems}>
                        {item.items.length} items - RM {item.total}
                      </Text>
                    )}
                    <TouchableOpacity 
                      style={styles.printButton}
                      onPress={() => printPendingJob(item)}
                      disabled={!isPrinterConnected}
                    >
                      <Text style={styles.printButtonText}>Print Now</Text>
                    </TouchableOpacity>
                  </View>
                )}
                keyExtractor={(item) => item.jobId}
              />
            ) : (
              <Text style={styles.emptyText}>No pending jobs</Text>
            )}

            {/* Completed Jobs */}
            <Text style={styles.sectionTitle}>Completed Jobs ({printJobs.completed.length})</Text>
            {printJobs.completed.length > 0 ? (
              <FlatList
                data={printJobs.completed.slice(0, 10)}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View style={[styles.jobCard, styles.completedCard]}>
                    <Text style={styles.jobId}>Order #{item.jobId}</Text>
                    <Text style={styles.jobTime}>
                      Printed: {new Date(item.printedAt).toLocaleTimeString()}
                    </Text>
                    <Text style={styles.jobStatus}>Status: {item.status}</Text>
                  </View>
                )}
                keyExtractor={(item) => item.jobId}
              />
            ) : (
              <Text style={styles.emptyText}>No completed jobs</Text>
            )}
          </ScrollView>
        );

      case SCREENS.SETTINGS:
        return (
          <ScrollView style={styles.screenContainer}>
            <Text style={styles.headerTitle}>Printer Settings</Text>

            {/* Saved Printers */}
            <Text style={styles.sectionTitle}>Saved Printers</Text>
            {savedPrinters.length > 0 ? (
              savedPrinters.map((printer, index) => (
                <View key={printer.address} style={styles.savedPrinterCard}>
                  <View>
                    <Text style={styles.printerName}>{printer.name}</Text>
                    <Text style={styles.printerAddress}>{printer.address}</Text>
                  </View>
                  <View style={styles.printerActions}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => removeSavedPrinter(printer.address)}
                    >
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No saved printers</Text>
            )}

            {/* Settings Options */}
            <Text style={styles.sectionTitle}>Print Settings</Text>
            <View style={styles.settingsCard}>
              {Object.entries(settings).map(([key, value]) => (
                <View key={key} style={styles.settingRow}>
                  <Text style={styles.settingLabel}>
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^./, str => str.toUpperCase())}
                  </Text>
                  {typeof value === 'boolean' ? (
                    <TouchableOpacity
                      style={[styles.toggle, value && styles.toggleActive]}
                      onPress={() => saveSettings({ ...settings, [key]: !value })}
                    >
                      <Text style={styles.toggleText}>{value ? 'ON' : 'OFF'}</Text>
                    </TouchableOpacity>
                  ) : (
                    <TextInput
                      style={styles.numberInput}
                      value={String(value)}
                      keyboardType="numeric"
                      onChangeText={(text) => saveSettings({ ...settings, [key]: Number(text) })}
                    />
                  )}
                </View>
              ))}
            </View>

            <Button 
              title="Discover Printers" 
              onPress={() => setCurrentScreen(SCREENS.PRINTERS)}
              color="#2196F3"
            />
          </ScrollView>
        );

      case SCREENS.PRINTERS:
        return (
          <View style={styles.screenContainer}>
            <ScrollView 
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={loadPrinters} />
              }
            >
              <Text style={styles.headerTitle}>Available Printers</Text>
              
              {pairedDevices.length > 0 ? (
                pairedDevices.map((device) => (
                  <TouchableOpacity
                    key={device.address}
                    style={[
                      styles.printerItem,
                      selectedPrinterRef.current?.address === device.address && styles.selectedPrinter
                    ]}
                    onPress={() => connectToPrinter(device)}
                    disabled={isLoading}
                  >
                    <View style={styles.printerInfo}>
                      <Text style={styles.deviceName}>{device.name}</Text>
                      <Text style={styles.deviceAddress}>{device.address}</Text>
                    </View>
                    <View style={styles.printerActions}>
                      {!savedPrinters.find(p => p.address === device.address) && (
                        <TouchableOpacity
                          style={styles.saveButton}
                          onPress={() => savePrinter(device)}
                        >
                          <Text style={styles.saveButtonText}>Save</Text>
                        </TouchableOpacity>
                      )}
                      {selectedPrinterRef.current?.address === device.address ? (
                        <Text style={styles.connectedText}>Connected</Text>
                      ) : (
                        <Text style={styles.connectText}>Connect</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No printers found</Text>
                  <Button title="Scan for Printers" onPress={loadPrinters} />
                </View>
              )}
            </ScrollView>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity 
          style={[styles.navButton, currentScreen === SCREENS.JOBS && styles.activeNavButton]}
          onPress={() => setCurrentScreen(SCREENS.JOBS)}
        >
          <Text style={styles.navButtonText}>Jobs</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navButton, currentScreen === SCREENS.SETTINGS && styles.activeNavButton]}
          onPress={() => setCurrentScreen(SCREENS.SETTINGS)}
        >
          <Text style={styles.navButtonText}>Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navButton, currentScreen === SCREENS.PRINTERS && styles.activeNavButton]}
          onPress={() => setCurrentScreen(SCREENS.PRINTERS)}
        >
          <Text style={styles.navButtonText}>Printers</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {renderScreen()}

      {/* Loading Modal */}
      <Modal transparent visible={isLoading}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.modalText}>Connecting to printer...</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  pinContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  pinTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  pinInput: {
    width: 200,
    height: 50,
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 10,
    marginBottom: 30,
  },
  pinButtons: {
    flexDirection: 'row',
    gap: 20,
  },
  pinButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  secondaryButton: {
    backgroundColor: '#757575',
  },
  pinButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  screenContainer: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshText: {
    color: '#2196F3',
    fontSize: 16,
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  connected: {
    backgroundColor: '#4CAF50',
  },
  disconnected: {
    backgroundColor: '#f44336',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  jobCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  completedCard: {
    borderLeftColor: '#4CAF50',
    opacity: 0.8,
  },
  jobId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  jobTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  jobItems: {
    fontSize: 14,
    color: '#333',
    marginTop: 5,
  },
  jobStatus: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 5,
  },
  printButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  printButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  savedPrinterCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  printerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  printerAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  printerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionButton: {
    padding: 5,
  },
  removeText: {
    color: '#f44336',
    fontSize: 14,
  },
  settingsCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  toggle: {
    paddingHorizontal: 15,
    paddingVertical: 5,
    backgroundColor: '#e0e0e0',
    borderRadius: 15,
  },
  toggleActive: {
    backgroundColor: '#4CAF50',
  },
  toggleText: {
    color: 'white',
    fontWeight: '600',
  },
  numberInput: {
    width: 60,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 5,
    textAlign: 'center',
  },
  printerItem: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedPrinter: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  printerInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  deviceAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  saveButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#4CAF50',
    borderRadius: 5,
    marginRight: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 12,
  },
  connectedText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  connectText: {
    color: '#2196F3',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginBottom: 20,
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeNavButton: {
    borderBottomWidth: 3,
    borderBottomColor: '#2196F3',
  },
  navButtonText: {
    fontSize: 14,
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalText: {
    marginTop: 20,
    fontSize: 16,
    color: '#333',
  },
});