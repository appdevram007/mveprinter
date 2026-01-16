import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Button,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Image
} from 'react-native';
import io from 'socket.io-client';
import axios from 'axios'; // Commented out as requested
import * as SunmiPrinter from '@mitsuharu/react-native-sunmi-printer-library';
import { orderApi } from './api'; // Import the API service
import { authService } from './authService'; // Add this import
import BackgroundService from 'react-native-background-actions';

const SOCKET_URL = "http://147.79.71.200:6060";
const DEVICE_ID = "LES_printer_01";
const DEFAULT_PIN = "739278";
// const API_BASE_URL = "http://147.79.71.200:6060/api"; // Commented out for now
const API_BASE_URL = "http://147.79.71.200:6060/api"; // Commented out for now


// Sample orders data provided


export default function PrinterApp() {
  const [socket, setSocket] = useState(null);
  const [socketStatus, setSocketStatus] = useState("Disconnected");
  const [isPrinterReady, setIsPrinterReady] = useState(false);
  const [printJobs, setPrintJobs] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [activeTab, setActiveTab] = useState('today');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
function formatDateWithDay(inputDate) {
  const parts = inputDate.split('/');
  if (parts.length !== 3) return inputDate;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  if (!day || !month || !year) return inputDate;

  // month - 1 because JS months are 0-based
  const date = new Date(year, month - 1, day);

  // strict validation (avoid 32/13/2026 etc)
  if (
    date.getDate() !== day ||
    date.getMonth() !== month - 1 ||
    date.getFullYear() !== year
  ) {
    return inputDate;
  }

  const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const daysZh = ['日', '一', '二', '三', '四', '五', '六'];

  const dayIndex = date.getDay();

  return `${day}/${month}/${year} ${daysEn[dayIndex]} (${daysZh[dayIndex]})`;
}

  const printQueue = [];
    const printQueuepending = [];
let isPrinting = false;
  useEffect(() => {
    checkLoginStatus();


  }, []);


  const enqueuePrintJob = (job) => {
  printQueue.push(job);
   printQueue.push(job);
  processPrintQueue();
};
  const enqueuePrintJobpending = (job) => {
  printQueue.push(job);
  processPrintQueuepending();
};
const processPrintQueuepending = async () => {
  if (isPrinting) return;
  if (printQueue.length === 0) return;

  isPrinting = true;
  const job = printQueue.shift();

  try {
    await reprintJob(job); 
  } catch (err) {
    console.error("Print failed:", err);
  } finally {
    isPrinting = false;
    processPrintQueuepending(); // 🔁 print next job
  }
};

const processPrintQueue = async () => {
  if (isPrinting) return;
  if (printQueue.length === 0) return;

  isPrinting = true;
  const job = printQueue.shift();

  try {
    await handlePrintJob(job); // 👈 your existing print logic
  } catch (err) {
    console.error("Print failed:", err);
  } finally {
    isPrinting = false;
    processPrintQueue(); // 🔁 print next job
  }
};


  const backgroundTask = async ({ socketUrl }) => {
  if (!socket || !socket.connected) {
    socket = io(socketUrl, { transports: ['websocket'] });
  }

  socket.on('connect', () => console.log('✅ Background socket connected'));
  socket.on('disconnect', () => console.log('🔌 Background socket disconnected'));

  socket.on('print_job', async (job) => {
    console.log('Background print job received', job);
    await handlePrintJob(job);
        // await handlePrintJob(job);
  });

  // Keep the task alive
  await new Promise(() => {});
};

// Background service options
const optionsback = {
  taskName: 'MVE Printer Service',
  taskTitle: 'Printing Orders',
  taskDesc: 'Keeps the app alive to print orders',
  taskIcon: { name: 'ic_launcher', type: 'mipmap' },
  parameters: { socketUrl: SOCKET_URL },
  allowWifiLock: true,
  onStop: () => {
    console.log('Background task stopped');
    socket?.disconnect();
  },
};

useEffect(() => {
  const running = BackgroundService.isRunning();
  if (!running) {
    BackgroundService.start(backgroundTask, optionsback);
  }

  return () => {
    // Optional stop
    if (BackgroundService.isRunning()) {
      BackgroundService.stop();
    }
  };
}, []);


 const checkpendingorder = async (dataprint) => {
  // Filter orders that are not printed yet
  const pendingOrders = dataprint.filter(o => o.receiptPrinted === false);
  console.log(pendingOrders, "pendingOrders");
//     Alert.alert(
//   'Confirm Order',
//   'Are you sure you want to confirm this order?',
//   [
//     // { text: 'No', onPress: () => {} },
//     { text: 'printing...', onPress: checkpendingorder },
//   ],
//   { cancelable: false }
// );

if(pendingOrders.length>0){



  // Process each pending order
  pendingOrders.forEach(order => {
    const job = {
      shopName: "KAYDEN",
      contact: order.phone,
      address: order.deliveryAddress,
      orderNumber: order.orderNumber,
      deliveryDate: order.deliveryDate,
      customerName: order.customer?.name || "", // fallback if customer object missing
      customerAddress: order.deliveryAddress, // reuse delivery address if customer address missing
      items: order.items.map(i => ({
        name_cn: i.name_cn,
        name_en: i.name,
        unit: i.unit.replace(/[0-9]/g, ''), // remove any numbers from unit
        quantity: i.quantity,
        price: i.price
      })),
      total: order.total
    };
enqueuePrintJobpending(order)
    console.log(job, "jobForPrinting");
  


    // Here you can call your printer function
    // e.g., printJob(job)
  });
  }
};


  


   const checkLoginStatus = async () => {
    try {
       
      const isLoggedIn = await authService.isLoggedIn();
      if (isLoggedIn) {
        setIsAuthenticated(true);
  //  checkpendingorder()
        // Optional: Get user data if needed
        // const userData = await authService.getUserData();
      }
    } catch (error) {
      console.error('Error checking login status:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // ================== PIN LOGIN ==================
  const handlePinSubmit = async () => {
    if (pin.length !== 6) {
      setPinError(true);
      Alert.alert("Invalid PIN", "Please enter 6-digit PIN");
      return;
    }

    if (pin === DEFAULT_PIN) {
      try {
        // Save login state
        const userData = {
          deviceId: DEVICE_ID,
          loggedInAt: new Date().toISOString(),
          // Add any other user data you want to save
        };
        
        await authService.saveLoginState(userData);
        await authService.saveDeviceId(DEVICE_ID);
        
        setIsAuthenticated(true);
        setPin("");
        setPinError(false);
        Alert.alert("Success", "Login successful!");
      } catch (error) {
        console.error('Error saving login state:', error);
        Alert.alert("Error", "Failed to save login state");
      }
    } else {
      setPinError(true);
      Alert.alert("Invalid PIN", "Please check your PIN and try again");
      setPin("");
    }
  };

  // ================== UPDATED LOGOUT ==================
  const handleLogout = async () => {
    try {
      await authService.clearLoginState();
      setIsAuthenticated(false);
      // Disconnect socket if connected
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      Alert.alert("Logged Out", "You have been logged out successfully");
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert("Error", "Failed to logout properly");
    }
  };


  // ================== INIT SUNMI PRINTER ==================
  const initPrinter = async () => {
    try {
      await SunmiPrinter.prepare();
      setIsPrinterReady(true);
      console.log("✅ SUNMI Printer Ready");
    } catch (e) {
      console.error("❌ SUNMI Printer Error", e);
      // Alert.alert("Printer Error", "SUNMI printer not available");
      setIsPrinterReady(false);
    }
  };

  function formatPhoneNumber(rawPhone) {
  if (!rawPhone) return '';

  const digits = rawPhone.replace(/\D/g, '');

  return `+${digits}`;
}
  // ================== FETCH PRINT JOBS (Using Sample Data) ==================
const fetchPrintJobs = async () => {
  try {
    setIsLoading(true);


    // Fetch orders from API
    const response = await orderApi.getAllOrders();
    const SAMPLE_ORDERS = response?.order || [];
    console.log(SAMPLE_ORDERS, "SAMPLE_ORDERSSAMPLE_ORDERS");

    // Transform sample orders to match our print job format
    const transformedJobs = SAMPLE_ORDERS.map(order => ({
      jobId: order?._id || "N/A",
      orderNumber: order?.orderNumber || "N/A",
      deliveryDate: order?.deliveryDate || "N/A",
      receiptPrinted:order?.receiptPrinted|| false,
      deliveryAddress: order?.deliveryAddress || order?.customer?.address || "No address provided",
      customer: order?.customer?.name || "Guest",
      items: (order?.items || []).map(item => ({
        name: item?.product?.productName || "Unknown",
        name_cn: item?.product?.productMandarin || "",
        unit: item?.product?.unit || "",
        quantity: item?.quantity || 0,
        price: item?.unitPrice || 0,
        subtotal: item?.subtotal || 0
      })),
      total: order?.totalAmount || 0,
      status: order?.status || "pending",
      createdAt: order?.createdAt || new Date().toISOString(),
      printTimestamp: order?.createdAt || new Date().toISOString(),
      phone: formatPhoneNumber(order?.customer?.phoneNumber || ""),
      content: [
        `Customer: ${order?.customer?.name || "Guest"}`,
        `Order: ${order?.orderNumber || "N/A"}`,
        `Date: ${order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : "N/A"}`,
        order?.deliveryAddress ? `Delivery: ${order.deliveryAddress}` : null,
        order?.deliveryDate ? `Delivery Date: ${order.deliveryDate}` : null,
        order?.specialInstructions ? `Instructions: ${order.specialInstructions}` : null
      ].filter(Boolean)
    }));
checkpendingorder(transformedJobs)
    setPrintJobs(transformedJobs);
  } catch (error) {
    console.error("Error fetching print jobs:", error);
    Alert.alert("Error", "Failed to load orders");
  } finally {
    setIsLoading(false);
    setRefreshing(false);
  }
};


  // ================== REPRINT JOB ==================
  const reprintJob = async (order) => {

    const job = {
    shopname: "KAYDEN",
    contact: order.phone,
    address:order.deliveryAddress,
    orderNumber:order.orderNumber,
    deliveryDate:order.deliveryDate,
    customerName: order.customer,
    customerAddress:order.deliveryAddress, // you can fill in if you have it
    items: order.items.map(i => ({
        name_cn: i.name_cn,
        name_en: i.name,
        unit:i.unit.replace(/[0-9]/g, ''),
        quantity: i.quantity,
        price: i.price
    })),
    total: order.total
};

    console.log(job)
 
    try {
      if (!isPrinterReady) {
        Alert.alert("Printer Error", "SUNMI printer not ready");
        return;
      }

   


  await SunmiPrinter.resetPrinterStyle()
  await SunmiPrinter.setAlignment('center')

  // HEADER
 // ===== CUSTOMER INFO =====
  await SunmiPrinter.setAlignment('left');
  await SunmiPrinter.setFontSize(22);
  await SunmiPrinter.setTextStyle('bold', true);
  await SunmiPrinter.printText(`Customer: ${job.customerName}`);
  await SunmiPrinter.printText(`Phone: ${job.contact}`);
    await SunmiPrinter.printText(`Delivery Date: ${formatDateWithDay(job.deliveryDate)}`);
  await SunmiPrinter.printText(`${job.customerAddress}`);
  await SunmiPrinter.printText(`Invoice : ${job.orderNumber}`);


  await SunmiPrinter.lineWrap(1)
  await SunmiPrinter.printHR('line')

  // ITEMS
  for (const i of job.items) {
    let unit = i.unit;
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

await SunmiPrinter.lineWrap(4);
await SunmiPrinter.resetPrinterStyle();


      const response2= await orderApi.updateOrderStatus({  orderNumber: job.orderNumber,
  receiptPrinted: true});
  console.log(response2)
  

    } catch (err) {
      console.error("❌ Reprint error:", err);
      Alert.alert("Reprint Failed", err.message);
    }
  };

  // ================== PRINT JOB HANDLER ==================
  
    const handlePrintJob = async (order2) => {

let order=JSON.parse(order2.ordersfull);
console.log(order)
const job = {
  shopname: "KAYDEN",
  contact: formatPhoneNumber(order.customer.phoneNumber),
  address: order.deliveryAddress,
  deliveryDate:order.deliveryDate?order.deliveryDate:"N/A",

  orderNumber: order.orderNumber,
  customerName: order.customer.name,
  customerAddress: order.customer.address || order.deliveryAddress,
  items: order.items.map(i => {
    const product = i.product;
    let unitPrice = product.price;

    // ✅ APPLY DISCOUNT ONLY FOR ROAST MEAT
    if (
      product &&
      product.productName?.toLowerCase() === "roast meat" &&
      order.customer?.discount
    ) {
      unitPrice = Math.max(0, unitPrice - order.customer.discount);
    }

    return {
      name_cn: product.productMandarin,
      name_en: product.productName,
      unit: product.unit.replace(/[0-9]/g, ''), // '1kg' → 'kg'
      quantity: i.quantity,
      price: unitPrice
    };
  }),
  total: order.totalAmount
};
console.log(job)


 
    try {

   

  await SunmiPrinter.resetPrinterStyle()
  await SunmiPrinter.setAlignment('center')

  // HEADER
 // ===== CUSTOMER INFO =====
  await SunmiPrinter.setAlignment('left');
  await SunmiPrinter.setFontSize(22);
  await SunmiPrinter.setTextStyle('bold', true);
  await SunmiPrinter.printText(`Customer: ${job.customerName}`);
  await SunmiPrinter.printText(`Phone: ${job.contact}`);
  await SunmiPrinter.printText(`Delivery Date: ${formatDateWithDay(job.deliveryDate)}`);

  await SunmiPrinter.printText(`${job.customerAddress}`);
  await SunmiPrinter.printText(`Invoice : ${job.orderNumber}`);
  await SunmiPrinter.lineWrap(1)
  await SunmiPrinter.printHR('line')

  // ITEMS
  for (const i of job.items) {
    let unit = i.unit;
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

    
 await orderApi.updateOrderStatus({  orderNumber: job.orderNumber,
  receiptPrinted: true});
  

    } catch (err) {
      console.error("❌ Reprint error:", err);
      Alert.alert("Reprint Failed", err.message);
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

    s.on("print_job", enqueuePrintJob);

    setSocket(s);
    return s;
  };


  const reconnectSocket = () => {
  console.log("⏳ Reconnecting socket...");
  if (socket) {
    socket.disconnect();
    setSocket(null);
  }
  connectSocket();
};
  // ================== FILTER AND SEARCH JOBS ==================
  const getFilteredJobs = useCallback(() => {
    let filtered = [...printJobs];
    
    // Filter by date tab
    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    switch (activeTab) {
      case 'today':
        filtered = filtered.filter(job => 
          new Date(job.printTimestamp).toDateString() === today
        );
        break;
      case 'yesterday':
        filtered = filtered.filter(job => 
          new Date(job.printTimestamp).toDateString() === yesterday.toDateString()
        );
        break;
      case 'all':
        filtered = filtered;
        break;
      default:
        filtered = filtered;
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(job => 
        job.orderNumber?.toLowerCase().includes(query) ||
        job.customer?.toLowerCase().includes(query) ||
        job.items?.some(item => item.name.toLowerCase().includes(query))
      );
    }
    
    return filtered.sort((a, b) => new Date(b.printTimestamp) - new Date(a.printTimestamp));
  }, [printJobs, activeTab, searchQuery]);

  // ================== REFRESH CONTROL ==================
  const onRefresh = () => {
    setRefreshing(true);

    fetchPrintJobs();
    reconnectSocket()
  };

  // ================== EFFECTS ==================
  useEffect(() => {
    if (isAuthenticated) {
      initPrinter();
      fetchPrintJobs();
      const s = connectSocket();

      return () => {
        s?.disconnect();
        s?.off("print_job", enqueuePrintJob);
      };
    }
  }, [isAuthenticated]);

  // ================== PROFESSIONAL LOGIN SCREEN ==================
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <StatusBar backgroundColor="#2c3e50" barStyle="light-content" />
        <KeyboardAvoidingView 
          style={styles.loginContent}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.loginHeader}>
              <Image
    source={require("./assets/icon.png")}
    style={styles.loginLogo}
    resizeMode="contain"
  />
            <Text style={styles.loginAppName}>MVE Printer</Text>
            <Text style={styles.loginSubtitle}>MVE  Cloud Printing System</Text>
          </View>
          
          <View style={styles.loginForm}>
            <View style={styles.pinContainer}>
              <Text style={styles.pinLabel}>Enter 6-Digit PIN</Text>
              <View style={[styles.pinInputContainer, pinError && styles.pinInputError]}>
                <TextInput
                  style={styles.pinInput}
                  value={pin}
                  onChangeText={(text) => {
                    setPin(text.replace(/[^0-9]/g, ''));
                    setPinError(false);
                  }}
                  placeholder="••••••"
                  placeholderTextColor="#a0a0a0"
                  keyboardType="numeric"
                  maxLength={6}
                  secureTextEntry
                  textAlign="center"
                  autoFocus
                />
                <View style={styles.pinDots}>
                  {[...Array(6)].map((_, index) => (
                    <View 
                      key={index} 
                      style={[
                        styles.pinDot,
                        index < pin.length && styles.pinDotFilled
                      ]}
                    />
                  ))}
                </View>
              </View>
              
              {pinError && (
                <Text style={styles.errorText}>Invalid PIN. Please try again.</Text>
              )}
            </View>
            
            <TouchableOpacity 
              style={[styles.loginButton, pin.length !== 6 && styles.loginButtonDisabled]}
              onPress={handlePinSubmit}
              disabled={pin.length !== 6}
            >
              <Text style={styles.loginButtonText}>Login to Dashboard</Text>
            </TouchableOpacity>
            
            <View style={styles.loginFooter}>
              <Text style={styles.footerText}>
               MVE System Version 2.0 
              </Text>
              <Text style={styles.footerHint}>
                For assistance, contact system administrator
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ================== MAIN DASHBOARD ==================
  const filteredJobs = getFilteredJobs();
  const totalOrders = printJobs.length;
  const todayOrders = printJobs.filter(job => 
    new Date(job.printTimestamp).toDateString() === new Date().toDateString()
  ).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Hi ,LES Sdn Bhd</Text>
          <Text style={styles.headerSubtitle}>Device: {DEVICE_ID}</Text>
        </View>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={() => handleLogout()}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* STATS CARDS */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalOrders}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{todayOrders}</Text>
          <Text style={styles.statLabel}>Today's Orders</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, 
            socketStatus === 'Connected' ? styles.statConnected : styles.statDisconnected
          ]}>
            {socketStatus === 'Connected' ? '✓' : '✗'}
          </Text>
          <Text style={styles.statLabel}>Cloud</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, 
            isPrinterReady ? styles.statConnected : styles.statDisconnected
          ]}>
            {isPrinterReady ? '✓' : '✗'}
          </Text>
          <Text style={styles.statLabel}>Printer</Text>
        </View>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by order #, customer, item..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Text style={styles.clearSearch}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* TABS */}
      <View style={styles.tabContainer}>
        {['today', 'yesterday', 'all'].map((tab) => (
          <TouchableOpacity 
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            <Text style={styles.tabCount}>
              {tab === 'today' ? todayOrders : 
               tab === 'yesterday' ? printJobs.filter(job => 
                 new Date(job.printTimestamp).toDateString() === new Date(new Date().setDate(new Date().getDate() - 1)).toDateString()
               ).length : 
               totalOrders}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* JOBS LIST */}
      <ScrollView 
        style={styles.jobList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3498db']}
            tintColor="#3498db"
          />
        }
      >
        {isLoading && printJobs.length === 0 ? (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        ) : filteredJobs.length > 0 ? (
          filteredJobs.map((job, index) => (
            <View key={job.jobId || index} style={styles.jobCard}>
              <View style={styles.jobCardHeader}>
                <View>
                  <Text style={styles.jobOrderNumber}>{job.orderNumber || `Order #${job.jobId?.slice(-8) || index + 1}`}</Text>
                  <Text style={styles.jobCustomer}>{job.customer || 'Unknown Customer'}</Text>
                  <Text style={styles.jobTime}>
                    {new Date(job.printTimestamp).toLocaleString()}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.reprintButton}
                  onPress={() => reprintJob(job)}
                >
                  <Text style={styles.reprintText}>{"Print"}</Text>
                </TouchableOpacity>
              </View>
              
              {job.items && job.items.length > 0 && (
                <View style={styles.jobItems}>
                  {job.items.slice(0, 2).map((item, idx) => (
                    <Text key={idx} style={styles.jobItemText}>
                      • {item.name} x{item.quantity} {item.unit}
                    </Text>
                  ))}
                  {job.items.length > 2 && (
                    <Text style={styles.moreItemsText}>
                      +{job.items.length - 2} more items
                    </Text>
                  )}
                </View>
              )}
              
              <View style={styles.jobCardFooter}>
                <Text style={styles.jobTotal}>RM {job.total?.toFixed(2) || '0.00'}</Text>
                <TouchableOpacity onPress={() => {
                  setSelectedReceipt(job);
                  setShowReceiptModal(true);
                }}>
                  <Text style={styles.viewReceipt}>View Details →</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No orders found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'Try a different search term' : 'Orders will appear here'}
            </Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={fetchPrintJobs}
            >
              <Text style={styles.refreshButtonText}>Refresh Orders</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* DIGITAL RECEIPT MODAL */}
      <Modal
        visible={showReceiptModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReceiptModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.modalReprintButton}
                  onPress={() => {
                    setShowReceiptModal(false);
                    setTimeout(() => reprintJob(selectedReceipt), 300);
                  }}
                >
                  <Text style={styles.modalReprintText}>Reprint</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowReceiptModal(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView style={styles.receiptContent}>
              {selectedReceipt && (
                <>
                  <View style={styles.receiptHeader}>
                    <Text style={styles.receiptShopName}>Les Food Resources Sdn Bhd Meat Shop</Text>
                    <Text style={styles.receiptOrderNumber}>
                      {selectedReceipt.orderNumber || `Order #${selectedReceipt.jobId?.slice(-8)}`}
                    </Text>
                    <Text style={styles.receiptDate}>
                      {new Date(selectedReceipt.printTimestamp).toLocaleString()}
                    </Text>
                  </View>
                  
                  <View style={styles.receiptCustomer}>
                    <Text style={styles.receiptSectionTitle}>CUSTOMER</Text>
                    <Text style={styles.customerName}>{selectedReceipt.customer || 'Unknown'}</Text>
                  </View>
                  
                  <View style={styles.receiptItems}>
                    <Text style={styles.receiptSectionTitle}>ITEMS</Text>
                    {selectedReceipt.items?.map((item, idx) => (
                      <View key={idx} style={styles.receiptItemRow}>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                        </View>
                        <Text style={styles.itemPrice}>RM {item.price?.toFixed(2)}</Text>
                        <Text style={styles.itemSubtotal}>RM {item.subtotal?.toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>
                  
                  <View style={styles.receiptTotal}>
                    <Text style={styles.totalLabel}>TOTAL</Text>
                    <Text style={styles.totalAmount}>RM {selectedReceipt.total?.toFixed(2)}</Text>
                  </View>
                  
                  {selectedReceipt.content && (
                    <View style={styles.receiptNotes}>
                      <Text style={styles.receiptSectionTitle}>NOTES</Text>
                      {selectedReceipt.content.map((line, idx) => (
                        <Text key={idx} style={styles.noteText}>{line}</Text>
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* FLOATING ACTION BUTTON */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={fetchPrintJobs}
      >
        <Text style={styles.fabText}>↻</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ================== STYLES ==================
const styles = StyleSheet.create({
  // Login Styles
  loginContainer: {
    flex: 1,
    backgroundColor: '#2c3e50',
  },
  loginContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 50,
  },
  loginAppName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 16,
    color: '#bdc3c7',
    textAlign: 'center',
  },
  loginForm: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },
  pinContainer: {
    width: '100%',
    marginBottom: 30,
  },
  pinLabel: {
    fontSize: 14,
    color: '#ecf0f1',
    marginBottom: 10,
    textAlign: 'center',
  },
pinInputContainer: {
  backgroundColor: 'rgba(255,255,255,0.9)',
  borderRadius: 12,
  marginBottom: 10,
  position: 'relative', // important for absolute dots
  height: 60,           // fixed height
},
  pinInputError: {
    borderWidth: 2,
    borderColor: '#e74c3c',
  },
  pinInput: {
    fontSize: 18,
    color: '#2c3e50',
    letterSpacing: 20,
    opacity: 0,
  },
  pinDots: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ecf0f1',
    marginHorizontal: 8,
  },
  pinDotFilled: {
    backgroundColor: '#3498db',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
  loginButton: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
  },
  loginButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginFooter: {
    marginTop: 30,
    alignItems: 'center',
  },
  footerText: {
    color: '#95a5a6',
    fontSize: 12,
    marginBottom: 5,
  },
  footerHint: {
    color: '#7f8c8d',
    fontSize: 11,
    textAlign: 'center',
  },

  // Dashboard Styles
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statConnected: {
    color: '#27ae60',
  },
  statDisconnected: {
    color: '#e74c3c',
  },
  statLabel: {
    fontSize: 11,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    paddingHorizontal: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#2c3e50',
  },
  clearSearch: {
    fontSize: 18,
    color: '#95a5a6',
    paddingHorizontal: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#3498db',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  activeTabText: {
    color: '#ffffff',
  },
  tabCount: {
    fontSize: 10,
    color: '#bdc3c7',
    marginTop: 2,
  },
  jobList: {
    flex: 1,
    paddingHorizontal: 15,
  },
  loader: {
    marginTop: 50,
  },
  jobCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  jobOrderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  jobCustomer: {
    fontSize: 14,
    color: '#495057',
    marginTop: 2,
  },
  jobTime: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  reprintButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  reprintText: {
    fontSize: 12,
    color: '#3498db',
    fontWeight: '600',
  },
  jobItems: {
    marginBottom: 15,
  },
  jobItemText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 4,
  },
  moreItemsText: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  jobCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 15,
  },
  jobTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  viewReceipt: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
  },
  loginLogo: {
    borderRadius:50,
  width: 100,                 // adjust size as needed
  height: 100,
  marginBottom: 10,           // spacing between logo and text
},
  emptyStateTitle: {
    fontSize: 18,
    color: '#6c757d',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: Dimensions.get('window').height * 0.9,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalReprintButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 15,
  },
  modalReprintText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  closeButton: {
    fontSize: 24,
    color: '#6c757d',
  },
  receiptContent: {
    padding: 20,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  receiptShopName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  receiptOrderNumber: {
    fontSize: 16,
    color: '#495057',
    marginBottom: 5,
  },
  receiptDate: {
    fontSize: 14,
    color: '#6c757d',
  },
  receiptCustomer: {
    marginBottom: 20,
  },
  receiptSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingBottom: 5,
  },
  customerName: {
    fontSize: 18,
    color: '#2c3e50',
    marginTop: 5,
  },
  receiptItems: {
    marginBottom: 20,
  },
  receiptItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: '#495057',
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#6c757d',
  },
  itemPrice: {
    fontSize: 14,
    color: '#6c757d',
    marginHorizontal: 10,
    width: 60,
  },
  itemSubtotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    width: 70,
    textAlign: 'right',
  },
  receiptTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: '#495057',
    paddingTop: 15,
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#495057',
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  receiptNotes: {
    marginBottom: 20,
  },
  noteText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 5,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 24,
    color: '#ffffff',
  },
});