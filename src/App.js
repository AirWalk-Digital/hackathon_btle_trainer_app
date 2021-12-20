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
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Stack from "@mui/material/Stack";

let targetPowerLevel = 0;

function requestControl() {
  const OpCode = 0x00;
  let buffer = new ArrayBuffer(1);
  let view = new DataView(buffer);
  view.setUint8(0, OpCode, true);

  return view;
}

function powerTarget(args) {
  console.log(args);
  const OpCode = 0x05;
  const power = args.power;

  const buffer = new ArrayBuffer(3);
  const view = new DataView(buffer);
  view.setUint8(0, OpCode, true);
  view.setUint16(1, power, true);

  return view;
}

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
        <Line type="monotone" dataKey="cadence" stroke="blue" strokeWidth={1} />
        <Line type="monotone" dataKey="speed" stroke="orange" strokeWidth={1} />
      </LineChart>
    </ResponsiveContainer>
  );
};

const Main = ({ data, disconnect, start }) => {
  return (
    <div>
      <MyChart data={data} />
      <Stack direction="row" spacing={2}>
        <Button
          onClick={() => start()}
          startIcon={<PlayArrowIcon />}
          variant="contained"
        >
          Start{" "}
        </Button>
        <Button
          onClick={() => disconnect()}
          variant="contained"
          startIcon={<BluetoothDisabledRoundedIcon />}
        >
          Disconnect
        </Button>
      </Stack>
    </div>
  );
};

function App() {
  const [supportsBluetooth, setSupportsBluetooth] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [state, setState] = useState({}); //{ runState: "stopped" });
  const [start, setStart] = useState(false);
  const [val, setVal] = useState();
  const [handleConnect, setHandleConnect] = useState(false);

  // When the component mounts, check that the browser supports Bluetooth
  useEffect(() => {
    if (navigator.bluetooth) {
      setSupportsBluetooth(true);
    }
  }, []);

  const plan = [
    { interval: 20, target: 100 },
    { interval: 20, target: 200 },
    { interval: 20, target: 300 },
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

    prevData[diff] = { ...prevData[diff], ...val };
    /* console.log("target", prevData[diff].target); */
    const currentTarget = prevData[diff].target;
    console.log("setting", currentTarget);
    /* const x = requestControl(); */
    /* console.log(x); */
    /* await val.targetCb(); */
    /* let power = 100; */

    /* console.log(val.cb); */
    /* await writeCharacteristic.writeValue(powerTarget({ power })); */
    /* await val.targetCb(powerTarget({ power })); */
    targetPowerLevel = currentTarget;
    setState({
      ...prevState,
      data: [...prevData],
    });
  }, [val]);

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

  useEffect(() => {
    if (!handleConnect) return;

    const connectToDeviceAndSubscribeToUpdates = async () => {
      // Search for Bluetooth devices that advertise a battery service
      const device = await navigator.bluetooth.requestDevice({
        filters: [{
          services: ["00001826-0000-1000-8000-00805f9b34fb"],
          optionalServices: ["00001818-0000-1000-8000-00805f9b34fb"]}]
        });

      setIsConnected(true);

      device.addEventListener("gattserverdisconnected", () =>
        setIsConnected(false)
      );

      const server = await device.gatt.connect();

      // Get the battery service from the Bluetooth device
      const service = await server.getPrimaryService(
        "00001826-0000-1000-8000-00805f9b34fb"
      );

      // Get the battery level characteristic from the Bluetooth device
      const readCharacteristic = await service.getCharacteristic(
        "00002ad2-0000-1000-8000-00805f9b34fb"
      );

      const writeCharacteristic = await service.getCharacteristic(
        "00002ad9-0000-1000-8000-00805f9b34fb"
      );

      // Subscribe to battery level notifications
      readCharacteristic.startNotifications();

      const handleCharacteristicValueChanged = (event) => {
        let dataview = new DataView(event.target.value.buffer);

        const speed = dataview.getUint16(2, true) / 100;
        const cadence = dataview.getUint16(4, true) * 0.5;
        const power = dataview.getInt16(6, true);
        console.log("to set", targetPowerLevel);

        writeCharacteristic.writeValue(
          powerTarget({ power: targetPowerLevel })
        );
        /* const inVal = dataview.getUint16(2, dataview, true); */
        const dt = new Date();
        setVal({
          dt: dt,
          power,
          speed,
          cadence,
        });
      };
      // When the battery level changes, call a function
      readCharacteristic.addEventListener(
        "characteristicvaluechanged",
        /* (event) => */
        /* handleCharacteristicValueChanged({ */
        /* event: event, */
        /* cb: writeCharacteristic.writeValue, */
        /* }) */
        handleCharacteristicValueChanged
      );

      ////////////////////
      await writeCharacteristic.startNotifications();
      await writeCharacteristic.writeValue(requestControl());

      /* let power = 100; */
      /* await writeCharacteristic.writeValue(powerTarget({ power })); */
    };
    connectToDeviceAndSubscribeToUpdates();

    setHandleConnect(false);
  }, [handleConnect, state]);

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
            onClick={() => setHandleConnect(true)}
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
          disconnect={() => {
            setState({});
            setIsConnected(false);
          }}
          start={() => {
            setStart(true);
          }}
        />
      )}
    </div>
  );
}

export default App;
