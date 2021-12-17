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

const MyChart = () => {
  const startDate = new Date();
  const initData = [];
  for (let i = 0; i < 600; i++) {
    initData[i] = { name: i.toString() };
  }
  const [state, setState] = useState(initData);
  useEffect(() => {
    const timer = setInterval(() => {
      const current = new Date();
      const diff = Math.floor((current - startDate) / 1000).toString();
      if (diff > 600) return;
      const r = Math.floor(Math.random() * 101);
      const prevState = state;
      prevState[diff] = { name: diff, power: r };
      setState([...prevState]);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <ResponsiveContainer height={"100%"} width={"100%"} aspect={3}>
      <LineChart
        width={500}
        height={300}
        data={state}
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
        <Line type="monotone" dataKey="power" stroke="#82ca9d" />
      </LineChart>
    </ResponsiveContainer>
  );
};

function App() {
  const [supportsBluetooth, setSupportsBluetooth] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  // When the component mounts, check that the browser supports Bluetooth
  useEffect(() => {
    if (navigator.bluetooth) {
      setSupportsBluetooth(true);
    }
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
          <MyChart />
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
