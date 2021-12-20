import "./App.css";
import React, { useEffect, useState, PureComponent } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Button, Alert } from "@mui/material";
import BluetoothSearchingRoundedIcon from "@mui/icons-material/BluetoothSearching";
import BluetoothDisabledRoundedIcon from "@mui/icons-material/BluetoothDisabled";

const MyChart = ({ data }) => {
  /* useEffect(() => { */
  /* setState([...data]); */
  /* }, data); */
  /* useEffect(() => {
   *   const timer = setInterval(() => {
   *     const current = new Date();
   *     const diff = Math.floor((current - startDate) / 1000).toString();
   *     if (diff > 600) return;
   *     const r = Math.floor(Math.random() * 101);
   *     const prevState = state;
   *     prevState[diff] = { name: diff, power: r };
   *     setState([...prevState]);
   *   }, 1000);
   *   return () => clearInterval(timer);
   * }, []);
   */
  return (
    <ResponsiveContainer height={"100%"} width={"100%"} aspect={3}>
      <LineChart
        width={500}
        height={300}
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis hide={true} dataKey="name" interval={100} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="power" stroke="red" strokeWidth={3} />
        <Line type="monotone" dataKey="target" stroke="green" strokeWidth={3} />
      </LineChart>
    </ResponsiveContainer>
  );
};

function App() {
  const [supportsBluetooth, setSupportsBluetooth] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [data, setData] = useState([]);
  const [startDate, setStartDate] = useState();

  const initData = (inData) => {
    /* console.log(inData); */
    /* if (inData.length > 0) return inData; */
    const initData = [];
    for (let i = 0; i < 600; i++) {
      initData[i] = { name: i.toString() };
    }
    return initData;
    /* setData(initData); */
    /* setIsConnected(true); */
  };

  // When the component mounts, check that the browser supports Bluetooth
  useEffect(() => {
    if (navigator.bluetooth) {
      setSupportsBluetooth(true);
    }
  }, []);

  const plan = [
    { interval: 20, target: 100 },
    { interval: 20, target: 150 },
    { interval: 20, target: 200 },
  ];

  useEffect(() => {
    if (data.length != 0) return;

    const initData = [];

    let outer = 0;
    plan.forEach((p) => {
      for (let i = 0; i < p.interval; i++) {
        initData[outer + i] = { name: i.toString(), target: p.target };
      }
      outer = outer + p.interval;
    });

    console.log(initData);
    /* for (let i = 0; i < 600; i++) { */
    /* initData[i] = { name: i.toString() }; */
    /* } */
    const dt = new Date();
    setData(initData);
    setStartDate(dt);
  }, []);

  const connectToDeviceAndSubscribeToUpdates = async () => {
    /* try { */
    // Search for Bluetooth devices that advertise a battery service
    const device = await navigator.bluetooth.requestDevice({
      /* filters: [{ namePrefix: "KI" }], */
      /* optionalServices: ["00001818-0000-1000-8000-00805f9b34fb"], */
      filters: [{ services: ["00001818-0000-1000-8000-00805f9b34fb"] }],
      //{ services: ["battery_service", "cycling_power"] }],
    });

    setIsConnected(true);
    /* initConnection(); */

    device.addEventListener("gattserverdisconnected", () =>
      setIsConnected(false)
    );

    const handleCharacteristicValueChanged = (event) => {
      let dataview = new DataView(event.target.value.buffer);
      const val = dataview.getUint16(2, dataview, true);
      console.log(val);

      const current = new Date();
      console.log(startDate);
      const diff = Math.floor((current - startDate) / 1000).toString();
      if (diff > 600) return;
      const prevState = data;
      /* const prevState = initData(data); */
      prevState[diff] = { ...prevState[diff], power: val };
      console.log(prevState[diff]);
      setData([...prevState]);

      /* setBatteryLevel(val); */
    };

    const server = await device.gatt.connect();

    // Get the battery service from the Bluetooth device
    const service = await server.getPrimaryService(
      "00001818-0000-1000-8000-00805f9b34fb"
    );
    /* const chars = await service.getCharacteristics(); */
    /* console.log(chars); */

    // Get the battery level characteristic from the Bluetooth device
    const characteristic = await service.getCharacteristic(
      "00002a63-0000-1000-8000-00805f9b34fb"
    );

    // Subscribe to battery level notifications
    characteristic.startNotifications();

    // When the battery level changes, call a function
    characteristic.addEventListener(
      "characteristicvaluechanged",
      handleCharacteristicValueChanged
    );
  };

  return (
    <div>
      {!supportsBluetooth && (
        <Alert severity="error">
          This browser doesn't support the Web Bluetooth API
        </Alert>
      )}
      {supportsBluetooth && !isConnected && (
        <div>
          <Button
            onClick={connectToDeviceAndSubscribeToUpdates}
            variant="contained"
            startIcon={<BluetoothSearchingRoundedIcon />}
          >
            Connect
          </Button>
        </div>
      )}
      {supportsBluetooth && isConnected && (
        <div>
          <MyChart data={data} />
          <Button
            onClick={() => setIsConnected(false)}
            variant="contained"
            startIcon={<BluetoothDisabledRoundedIcon />}
          >
            Disconnect
          </Button>
        </div>
      )}
    </div>
  );
}

export default App;
