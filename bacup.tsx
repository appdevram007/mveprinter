import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Button,
  ScrollView,
  Alert
} from 'react-native';
import io from 'socket.io-client';
import * as SunmiPrinter from '@mitsuharu/react-native-sunmi-printer-library';

// const SOCKET_URL = "http://192.168.1.13:3000";
const SOCKET_URL = "http://147.79.71.200:6060";
const DEVICE_ID = "kitchen_printer_01";

export default function PrinterApp() {

  const [socket, setSocket] = useState(null);
  const [socketStatus, setSocketStatus] = useState("Disconnected");
  const [isPrinterReady, setIsPrinterReady] = useState(false);
  const [lastPrintJob, setLastPrintJob] = useState(null);

  // ================== INIT SUNMI PRINTER ==================
  const initPrinter = async () => {
    try {
      await SunmiPrinter.prepare();
      setIsPrinterReady(true);
      console.log("✅ SUNMI Printer Ready");
    } catch (e) {
      console.error("❌ SUNMI Printer Error", e);
      Alert.alert("Printer Error", "SUNMI printer not available");
      setIsPrinterReady(false);
    }
  };

  // ================== SOCKET CONNECTION ==================
  const connectSocket = () => {
    const s = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    s.on("connect", () => {
      console.log("✅ Socket connected:", s.id);
      setSocketStatus("Connected");

      s.emit("register_device", {
        deviceId: DEVICE_ID,
        type: "sunmi_printer",
        model: "SUNMI",
        connected: true,
        timestamp: new Date().toISOString()
      });
    });

    s.on("disconnect", () => {
      console.log("🔌 Socket disconnected");
      setSocketStatus("Disconnected");
    });

    s.on("connect_error", (err) => {
      console.error("❌ Socket error:", err.message);
      setSocketStatus("Error");
    });

    setSocket(s);
    return s;
  };

  // ================== PRINT JOB HANDLER ==================
  const handlePrintJob = async (job) => {
    console.log("📄 Print job received:", job);
    setLastPrintJob(job);

    if (!isPrinterReady) {
      Alert.alert("Printer Error", "SUNMI printer not ready");
      return;
    }

    try {
      await SunmiPrinter.prepare();

      // ===== HEADER =====
      await SunmiPrinter.setAlignment('center');
      await SunmiPrinter.setTextStyle('bold', true);
      await SunmiPrinter.printText('MY SHOP\n\n');

      await SunmiPrinter.setTextStyle('bold', false);
      await SunmiPrinter.setAlignment('left');

      // ===== CONTENT =====
      if (job.content) {
        const lines = Array.isArray(job.content) ? job.content : [job.content];
        for (const line of lines) {
          await SunmiPrinter.printText(`${line}\n`);
        }
      }

      if (job.items && Array.isArray(job.items)) {
        for (const item of job.items) {
          await SunmiPrinter.printText(
            `${item.name} x${item.quantity}  RM ${item.price}\n`
          );
        }
      }

      await SunmiPrinter.printText('----------------------\n');

      if (job.total) {
        await SunmiPrinter.printText(`TOTAL: RM ${job.total}\n`);
      }

      await SunmiPrinter.printText('\n\n');

      // ===== ACK =====
      socket?.emit("print_acknowledged", {
        deviceId: DEVICE_ID,
        jobId: job.jobId,
        status: "printed",
        timestamp: new Date().toISOString()
      });

      Alert.alert("Success", "Printed successfully");

    } catch (err) {
      console.error("❌ Print error:", err);

      socket?.emit("print_acknowledged", {
        deviceId: DEVICE_ID,
        jobId: job.jobId,
        status: "failed",
        error: err.message
      });

      Alert.alert("Print Failed", err.message);
    }
  };

  // ================== MANUAL TEST PRINT ==================
  const manualTestPrint = async () => {
    try {
      await SunmiPrinter.prepare();

      await SunmiPrinter.setAlignment('center');
      await SunmiPrinter.setTextStyle('bold', true);
      await SunmiPrinter.printText('TEST PRINT\n\n');

      await SunmiPrinter.setTextStyle('bold', false);
      await SunmiPrinter.setAlignment('left');
      await SunmiPrinter.printText('Item A  RM 10.00\n');
      await SunmiPrinter.printText('Item B  RM 5.00\n');
      await SunmiPrinter.printText('------------------\n');
      await SunmiPrinter.printText('TOTAL: RM 15.00\n\n');

      Alert.alert("Success", "Test print completed");
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  // ================== EFFECTS ==================
  useEffect(() => {
    initPrinter();
    const s = connectSocket();

    return () => {
      s?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("print_job", handlePrintJob);
    return () => socket.off("print_job", handlePrintJob);
  }, [socket, isPrinterReady]);

  // ================== UI ==================
  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: '#f5f5f5' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        MVE Printer Dashboard
      </Text>

      {/* STATUS */}
      <View style={{ backgroundColor: 'white', padding: 15, borderRadius: 10 }}>
        <Text>Socket: <Text style={{ fontWeight: 'bold' }}>{socketStatus}</Text></Text>
        <Text>Printer: <Text style={{ fontWeight: 'bold' }}>
          {isPrinterReady ? 'SUNMI Ready' : 'Not Ready'}
        </Text></Text>
      </View>

      {/* LAST JOB */}
      {lastPrintJob && (
        <View style={{
          marginTop: 15,
          backgroundColor: '#e3f2fd',
          padding: 10,
          borderRadius: 10
        }}>
          <Text style={{ fontWeight: 'bold' }}>Last Print Job</Text>
          <ScrollView style={{ maxHeight: 150 }}>
            <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
              {JSON.stringify(lastPrintJob, null, 2)}
            </Text>
          </ScrollView>
        </View>
      )}

      {/* ACTIONS */}
      <View style={{ marginTop: 20 }}>
        <Button title="Manual Test Print" onPress={manualTestPrint} />
      </View>
    </View>
  );
}
