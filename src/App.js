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

const Main = ({ data, disconnect, start }) => {
  return (
    <div>
      <MyChart data={data} />
      <Button onClick={() => start()}>Start </Button>
      <Button
        onClick={() => disconnect()}
        variant="contained"
        startIcon={<BluetoothDisabledRoundedIcon />}
      >
        Disconnect
      </Button>
    </div>
  );
};

function App() {
  const [supportsBluetooth, setSupportsBluetooth] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  /* const [data, setData] = useState([]); */
  /* const [startDate, setStartDate] = useState(); */
  /* const [requestStart, setRequestStart] = useState(false); */
  const [state, setState] = useState({}); //{ runState: "stopped" });
  const [start, setStart] = useState(false);
  const [val, setVal] = useState();

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
    // work out which element of array needs the power data updating
    if (state.runState !== "run") return;
    const diff = Math.floor((val.dt - state.startDate) / 1000).toString();

    // if the workout has finished stop adding data to the chart
    if (diff >= state.data.length) return;

    // otherwise set the current power in the array
    const prevState = state;
    const prevData = state.data;

    prevData[diff] = { ...prevData[diff], power: val.val };
    setState({ ...prevState, data: [...prevData] });
  }, [val]);

  const handleCharacteristicValueChanged = (event) => {
    let dataview = new DataView(event.target.value.buffer);
    const inVal = dataview.getUint16(2, dataview, true);
    const dt = new Date();
    setVal({ dt: dt, val: inVal });
  };

  useEffect(() => {
    if (!start) return;

    const prevState = state;
    const initData = [];

    // build up initial array for target power. This means we can alter existing values as actual power arrives and have them appear on the graph
    let outer = 0;
    plan.forEach((p) => {
      for (let i = 0; i < p.interval; i++) {
        initData[outer + i] = { name: i.toString(), target: p.target };
      }
      outer = outer + p.interval;
    });

    // store the current date to work out date differences for which array element to wite power data into later
    const dt = new Date();
    const newState = {
      ...prevState,
      data: initData,
      startDate: dt,
      runState: "run",
    };
    console.log(newState);
    setState({ ...newState });
    setStart(false);
  }, [start]);

  const connectToDeviceAndSubscribeToUpdates = async () => {
    // Search for Bluetooth devices that advertise a battery service
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ["00001818-0000-1000-8000-00805f9b34fb"] }],
    });

    setIsConnected(true);

    device.addEventListener("gattserverdisconnected", () =>
      setIsConnected(false)
    );

    const server = await device.gatt.connect();

    // Get the battery service from the Bluetooth device
    const service = await server.getPrimaryService(
      "00001818-0000-1000-8000-00805f9b34fb"
    );

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
        <Main
          data={state.data}
          disconnect={() => setIsConnected(false)}
          start={() => {
            setStart(true);
          }}
        />
      )}
    </div>
  );
}

export default App;
