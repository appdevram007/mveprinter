import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SunmiPrinter from '@mitsuharu/react-native-sunmi-printer-library';

const SOCKET_URL = "http://147.79.71.200:6060";
const DEVICE_ID = "kitchen_printer_01";

// Navigation screens
const SCREENS = {
  LOGIN: 'LOGIN',
  JOBS: 'JOBS',
  SETTINGS: 'SETTINGS',
  PRINTERS: 'PRINTERS',
  PREVIEW: 'PREVIEW',
};

export default function PrinterApp() {
  const [socket, setSocket] = useState(null);
  const [socketStatus, setSocketStatus] = useState("Disconnected");
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);
  const [currentScreen, setCurrentScreen] = useState(SCREENS.LOGIN);
  const [pin, setPin] = useState('');
  const [savedPrinters, setSavedPrinters] = useState([]);
  const [jobs, setJobs] = useState({ pending: [], completed: [] });
  const [selectedJob, setSelectedJob] = useState(null);
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

  // ------------------- AsyncStorage -------------------
  useEffect(() => {
    loadSettings();
    loadSavedPrinters();
    loadJobs();
    loadLoginState();
  }, []);

  const loadSavedPrinters = async () => {
    try {
      const data = await AsyncStorage.getItem('@saved_printers');
      if (data) setSavedPrinters(JSON.parse(data));
    } catch (e) { console.error(e); }
  };

  const loadSettings = async () => {
    try {
      const data = await AsyncStorage.getItem('@printer_settings');
      if (data) setSettings(JSON.parse(data));
    } catch (e) { console.error(e); }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('@printer_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
      Alert.alert("Success", "Settings saved!");
    } catch (e) { console.error(e); }
  };

  const loadJobs = async () => {
    try {
      const data = await AsyncStorage.getItem('@printer_jobs');
      if (data) setJobs(JSON.parse(data));
    } catch (e) { console.error(e); }
  };

  const saveJobs = async (newJobs) => {
    try {
      await AsyncStorage.setItem('@printer_jobs', JSON.stringify(newJobs));
    } catch (e) { console.error(e); }
  };

  const loadLoginState = async () => {
    try {
      const savedPin = await AsyncStorage.getItem('@login_pin');
      if (savedPin) setCurrentScreen(SCREENS.JOBS);
    } catch (e) { console.error(e); }
  };

  const saveLoginState = async () => {
    try {
      await AsyncStorage.setItem('@login_pin', pin);
    } catch (e) { console.error(e); }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('@login_pin');
    setCurrentScreen(SCREENS.LOGIN);
  };

  // ------------------- Socket -------------------
  const connectSocket = () => {
    const s = io(SOCKET_URL, { transports: ["websocket"], reconnection: true });
    s.on("connect", () => {
      setSocketStatus("Connected");
    
      if (selectedPrinterRef.current && isPrinterConnected) registerToServer();
    });
    s.on("disconnect", () => setSocketStatus("Disconnected"));
    s.on("connect_error", () => setSocketStatus("Connection Error"));

    s.on("print_job", async (job) => handleIncomingJob(job));
    setSocket(s);
  };

  useEffect(() => { connectSocket(); }, []);

  // ------------------- Jobs -------------------
  const handleIncomingJob = async (rawJob) => {
    const job = {
      jobId: rawJob.jobId || `JOB-${Date.now()}`,
      shopname: rawJob.shopname,
      items: rawJob.items || [],
      total: rawJob.total || 0,
      contact: rawJob.contact,
      address: rawJob.address,
      timestamp: rawJob.timestamp || new Date().toISOString(),
      status: 'pending',
    };

    const updatedJobs = { pending: [job, ...jobs.pending], completed: [...jobs.completed] };
    setJobs(updatedJobs);
    await saveJobs(updatedJobs);

    if (settings.autoPrint) printJob(job);
  };

  const printJob = async (job) => {
    if (!selectedPrinterRef.current) return Alert.alert("Error", "No printer connected");

    try {
      setIsLoading(true);

      const receipt = formatReceipt(job);
      await SunmiPrinter.printText(receipt);
      await SunmiPrinter.cutPaper();

      const completedJob = { ...job, status: "printed", printedAt: new Date().toISOString() };
      const updatedJobs = {
        pending: jobs.pending.filter(j => j.jobId !== job.jobId),
        completed: [completedJob, ...jobs.completed]
      };
      setJobs(updatedJobs);
      await saveJobs(updatedJobs);

      socket?.emit("print_acknowledged", { deviceId: DEVICE_ID, jobId: job.jobId, status: "printed" });
    } catch (err) {
      console.error(err);
      socket?.emit("print_acknowledged", { deviceId: DEVICE_ID, jobId: job.jobId, status: "failed", error: err.message });
      Alert.alert("Print Failed", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const registerToServer = () => {
    if (!socket || !socket.connected) return;
    socket.emit("register_device", {
      deviceId: DEVICE_ID,
      type: "thermal_printer",
      connected: true,
      model: selectedPrinterRef.current?.name || "Sunmi"
    });
  };

  // ------------------- Receipt Formatter -------------------
  const formatReceipt = (job) => {
    let output = "\x1B\x61\x00"; // left
    output += "\x1B\x45\x01" + job.shopname + "\n\x1B\x45\x00";
    output += `Contact: ${job.contact}\nAddress: ${job.address}\n\n`;
    output += "--------------------------------\n";
    job.items.forEach(i => {
      const line = i.name.padEnd(22) + i.price.toFixed(2).padStart(10);
      const qty = "Qty: " + i.quantity;
      output += line + "\n" + qty + "\n";
    });
    output += "--------------------------------\n";
    output += "\x1B\x45\x01" + "TOTAL".padEnd(22) + job.total.toFixed(2).padStart(10) + "\x1B\x45\x00\n";
    output += "\x1B\x61\x01Thank you!\n\n\n";
    return output;
  };

  // ------------------- Login -------------------
  const verifyPin = async () => {
    const correctPin = "123456";
    if (pin === correctPin) {
      setCurrentScreen(SCREENS.JOBS);
      await saveLoginState();
    } else {
      Alert.alert("Error", "Invalid PIN");
    }
  };

  // ------------------- UI Screens -------------------
  const renderLogin = () => (
    <View style={styles.centered}>
      <Text style={styles.title}>Enter PIN</Text>
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
      <TouchableOpacity style={styles.button} onPress={verifyPin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );

  const renderJobs = () => (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {}} />}>
      <View style={styles.statusBar}>
        <Text>Socket: {socketStatus}</Text>
        <Text>Printer: {isPrinterConnected ? "Connected" : "Disconnected"}</Text>
        <TouchableOpacity onPress={logout}><Text style={{ color: 'red' }}>Logout</Text></TouchableOpacity>
      </View>
       <TouchableOpacity style={styles.button} onPress={() => printReceipt()}>
        <Text style={styles.buttonText}>Print test </Text>
      </TouchableOpacity>

      <Text style={styles.section}>Pending Jobs</Text>
      {jobs.pending.length === 0 && <Text style={styles.empty}>No pending jobs</Text>}
      <FlatList
        data={jobs.pending}
        keyExtractor={item => item.jobId}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.jobTitle}>Order #{item.jobId}</Text>
            <Text>Items: {item.items.length} | Total: RM {item.total}</Text>
            <TouchableOpacity style={styles.printButton} onPress={() => printJob(item)}>
              <Text style={styles.printButtonText}>Print Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.previewButton} onPress={() => { setSelectedJob(item); setCurrentScreen(SCREENS.PREVIEW); }}>
              <Text style={styles.previewText}>Preview</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Text style={styles.section}>Completed Jobs</Text>
      {jobs.completed.length === 0 && <Text style={styles.empty}>No completed jobs</Text>}
      <FlatList
        data={jobs.completed}
        keyExtractor={item => item.jobId}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: '#E8F5E9' }]}>
            <Text style={styles.jobTitle}>Order #{item.jobId}</Text>
            <Text>Printed at: {new Date(item.printedAt).toLocaleTimeString()}</Text>
          </View>
        )}
      />
    </ScrollView>
  );


const printReceipt = async () => {

 let job={
  "shopname": "KAYDEN",
  "contact": "012-345 6789",
  "address": "12, Jalan SS2/24,\n47300 Petaling Jaya,\nSelangor",
  "customerName": "Mr. Lim Wei Jian",
  "customerAddress": "No. 8, Jalan Bukit Indah 3,\nTaman Bukit Indah,\n81200 Johor Bahru",
  "items": [
    {
      "name_cn": "新鲜",
      "name_en": "Fresh Chicken Thigh",
      "quantity": 2,
      "price": 12.50
    },
    {
      "name_cn": "五花",
      "name_en": "Local Pork Belly",
      "quantity": 1,
      "price": 38.00
    },
    {
      "name_cn": "精选",
      "name_en": "Imported Beef Slice",
      "quantity": 3,
      "price": 28.90
    }
  ],
  "total": 150.70
}

  await SunmiPrinter.prepare()

  await SunmiPrinter.resetPrinterStyle()
  await SunmiPrinter.setAlignment('center')

  // HEADER
 // ===== CUSTOMER INFO =====
  await SunmiPrinter.setAlignment('left');
  await SunmiPrinter.setFontSize(22);
  await SunmiPrinter.setTextStyle('bold', true);
  await SunmiPrinter.printText(`Customer: ${job.customerName}`);
    await SunmiPrinter.printText(`Phone : +60-1234567821`);
  await SunmiPrinter.printText(`${job.customerAddress}`);

  await SunmiPrinter.lineWrap(1)
  await SunmiPrinter.printHR('line')

  // ITEMS
  for (const i of job.items) {
    let unit = i.quantity % 2 === 0 ? 'kg' : 'kati';

    // 🔴 Chinese name + qty + unit (BIG)
    await SunmiPrinter.setFontSize(28)
    await SunmiPrinter.setTextStyle('bold', true)

   await SunmiPrinter.printColumnsString(
      [i.name_cn, `${i.quantity} ${unit}`],
      [22, 10],
      ['left', 'right']
    )

    // 🔵 English name + price (SMALL, SAME LINE)
    await SunmiPrinter.setFontSize(18)
    await SunmiPrinter.setTextStyle('bold', false)

    await SunmiPrinter.printColumnsString(
      [
        i.name_en,
        `RM ${i.price.toFixed(2)}`,
      ],
      [22, 10],
      ['left', 'right']
    )

    await SunmiPrinter.lineWrap(1)
  }

  // TOTAL
  await SunmiPrinter.printHR('line')

  await SunmiPrinter.setFontSize(26)
  await SunmiPrinter.setTextStyle('bold', true)

  await SunmiPrinter.printColumnsString(
    ['TOTAL', `RM ${job.total.toFixed(2)}`],
    [22, 10],
    ['left', 'right']
  )

  await SunmiPrinter.lineWrap(3)
  await SunmiPrinter.resetPrinterStyle()
}

const printReceipt2ww = async () => {

  let job={
  "shopname": "KAYDEN",
  "contact": "012-345 6789",
  "address": "12, Jalan SS2/24,\n47300 Petaling Jaya,\nSelangor",
  "customerName": "Mr. Lim Wei Jian",
  "customerAddress": "No. 8, Jalan Bukit Indah 3,\nTaman Bukit Indah,\n81200 Johor Bahru",
  "items": [
    {
      "name_cn": "新鲜",
      "name_en": "Fresh Chicken Thigh",
      "quantity": 2,
      "price": 12.50
    },
    {
      "name_cn": "五花",
      "name_en": "Local Pork Belly",
      "quantity": 1,
      "price": 38.00
    },
    {
      "name_cn": "精选",
      "name_en": "Imported Beef Slice",
      "quantity": 3,
      "price": 28.90
    }
  ],
  "total": 150.70
}

  await SunmiPrinter.prepare();

  // ===== HEADER =====
  // await SunmiPrinter.setAlignment('center');
  // await SunmiPrinter.setTextStyle('bold', true);
  // await SunmiPrinter.setFontSize(28);
  // await SunmiPrinter.printText(`${job.shopname}\n`);

  // await SunmiPrinter.setFontSize(20);
  // await SunmiPrinter.setTextStyle('bold', false);
  // await SunmiPrinter.printText(`Contact: ${job.contact}\n`);
  // await SunmiPrinter.printText(`${job.address}\n`);
  // await SunmiPrinter.printText('--------------------------------\n');

  // ===== CUSTOMER INFO =====
  await SunmiPrinter.setAlignment('left');
  await SunmiPrinter.setFontSize(22);
  await SunmiPrinter.setTextStyle('bold', true);
  await SunmiPrinter.printText(`Customer: ${job.customerName}`);
    await SunmiPrinter.printText(`Phone : +60-1234567821`);
  await SunmiPrinter.printText(`${job.customerAddress}`);
  await SunmiPrinter.printText('----------------------------------');

  // ===== ITEMS =====
// ===== ITEMS =====
// ===== ITEMS =====
for (const i of job.items) {
  // ONE LINE: Mandarin + Qty (no price here)
  await SunmiPrinter.setFontSize(28);
  await SunmiPrinter.setTextStyle('bold', true);
  const unit = i.quantity % 2 === 0 ? 'kg' : 'kati';
  const namew = i.name_cn.length > 18 ? i.name_cn.slice(0, 17) + '…' : i.name_cn;

const qtyUnit = `${i.quantity} ${unit}`;

  await SunmiPrinter.printColumnsText(
    [namew, qtyUnit],
    [25, 7],           // column widths: total ≤ 32
    ['left', 'right']   // name left, quantity right
  );

  // English name + price (same line, smaller font)
  await SunmiPrinter.setFontSize(18);
  await SunmiPrinter.setTextStyle('bold', false);
  await SunmiPrinter.printColumnsText(
    [
      i.name_en,
      `RM ${(i.price * i.quantity).toFixed(2)}`
    ],
    [20, 10], // adjust width ratios
    ['left', 'right']
  );
}





  // ===== TOTAL =====
  await SunmiPrinter.printText('----------------------------------');

  await SunmiPrinter.setTextStyle('bold', true);
  await SunmiPrinter.setFontSize(24);
  await SunmiPrinter.printColumnsText(
    ['TOTAL', "RM "+job.total.toFixed(2)],
    [16, 15],
    ['left', 'right']
  );

  // ===== FOOTER =====
  await SunmiPrinter.setAlignment('center');
  await SunmiPrinter.setFontSize(20);
  await SunmiPrinter.setTextStyle('bold', false);
  await SunmiPrinter.printText('\nThank you!\n\n');

  await SunmiPrinter.cutPaper();
};


async function printReceipt2() {
  try {
    let order={
  "deviceId": "kitchen_printer_01",
  "shopname": "MVE Customer",
  "address": "123 Main Street, Kuala Lumpur",
  "contact": "+60 12-345 6789",
  "orderNumber": "ORD-20260101-001",
  "deliveryDate": "2026-01-01 18:30",
  "items": [
    {
      "name": "Sweet and Sour Pork",
      "productMandarin": "糖醋里脊",
      "price": 25.00,
      "quantity": "2Xpcs"
    },
    {
      "name": "Kung Pao Chicken",
      "productMandarin": "宫保鸡丁",
      "price": 30.00,
      "quantity": "1Xpcs"
    },
    {
      "name": "Fried Rice",
      "productMandarin": "炒饭",
      "price": 10.00,
      "quantity": "3Xplate"
    }
  ],
  "total": 105.00,
  "deliveryAddress": "456 Jalan Bukit Bintang, Kuala Lumpur"
}

    await SunmiPrinter.prepare();

        // --- Customer Info ---
    await SunmiPrinter.setAlignment('left');
    await SunmiPrinter.setTextStyle('bold', true);
    await SunmiPrinter.setFontSize(24); // readable for shop name
    await SunmiPrinter.printText(`${order.shopname}\n`);

    await SunmiPrinter.setTextStyle('bold', false);
    await SunmiPrinter.setFontSize(16); // smaller for address/contact
    await SunmiPrinter.printText(`${order.address}\n`);
    await SunmiPrinter.printText(`Contact: ${order.contact}\n`);
    await SunmiPrinter.printText('--------------------------------\n');

    // --- Items ---
    for (let item of order.items) {
      // Mandarin - very big for elderly
      await SunmiPrinter.setFontSize(32);
      await SunmiPrinter.setTextStyle('bold', true);
      await SunmiPrinter.setAlignment('left');
      await SunmiPrinter.printText(`${item.productMandarin}\n`);

      // English + qty + price - small inline
      await SunmiPrinter.setFontSize(16);
      await SunmiPrinter.setTextStyle('bold', false);
      
      // Format: English name + quantity + price aligned right
      const qtyPrice = `${item.quantity}  $${item.price.toFixed(2)}`.padStart(20);
      await SunmiPrinter.printText(`${item.name} ${qtyPrice}\n`);

      await SunmiPrinter.lineWrap(1);
    }

    await SunmiPrinter.printText('--------------------------------\n');

    // --- Total ---
    await SunmiPrinter.setFontSize(24);
    await SunmiPrinter.setTextStyle('bold', true);
    await SunmiPrinter.setAlignment('right');
    await SunmiPrinter.printText(`TOTAL: $${order.total.toFixed(2)}\n`);

    await SunmiPrinter.lineWrap(3);


    await SunmiPrinter.cut();
  } catch (error) {
    console.log('Print error:', error);
  }
}

  const renderPreview = () => (
    <View style={styles.centered}>
      <Text style={styles.title}>Receipt Preview</Text>
      <ScrollView style={styles.previewBox}>
        <Text>{selectedJob ? formatReceipt(selectedJob) : ""}</Text>
      </ScrollView>
      <TouchableOpacity style={styles.button} onPress={() => setCurrentScreen(SCREENS.JOBS)}>
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderScreen = () => {
    switch (currentScreen) {
      case SCREENS.LOGIN: return renderLogin();
      case SCREENS.JOBS: return renderJobs();
      case SCREENS.PREVIEW: return renderPreview();
      default: return <Text>Coming Soon...</Text>;
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {renderScreen()}
      <Modal transparent visible={isLoading}>
        <View style={styles.modal}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={{ marginTop: 10, color: '#fff' }}>Printing...</Text>
        </View>
      </Modal>
    </View>
  );
}

// ------------------- Styles -------------------
const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  pinInput: { width: 200, height: 50, borderWidth: 2, borderColor: '#2196F3', borderRadius: 10, textAlign: 'center', fontSize: 24, marginBottom: 20 },
  button: { backgroundColor: '#2196F3', padding: 15, borderRadius: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  section: { fontSize: 20, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10 },
  jobTitle: { fontWeight: 'bold', marginBottom: 5 },
  printButton: { marginTop: 10, backgroundColor: '#4CAF50', padding: 8, borderRadius: 5, alignItems: 'center' },
  printButtonText: { color: '#fff' },
  previewButton: { marginTop: 5, alignItems: 'center' },
  previewText: { color: '#2196F3' },
  empty: { color: '#999', marginBottom: 10 },
  statusBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modal: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  previewBox: { width: '100%', backgroundColor: '#f0f0f0', padding: 10, borderRadius: 8, maxHeight: '70%' }
});
