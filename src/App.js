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

function App() {
  const [supportsBluetooth, setSupportsBluetooth] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [data, setData] = useState([]);
  const [startDate, setStartDate] = useState();
  const [targetPowerLevel, setTargetPowerLevel] = useState(null);
  const [speed, setSpeed] = useState(null);
  const [cadence, setCadence] = useState(null);
  const [power, setPower] = useState(null);

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

    // build up initial array for target power. This means we can alter existing values as actual power arrives and have them appear on the graph
    let outer = 0;
    plan.forEach((p) => {
      for (let i = 0; i < p.interval; i++) {
        initData[outer + i] = { name: i.toString(), target: p.target };
      }
      outer = outer + p.interval;
    });

    setData(initData);
    // store the current date to work out date differences for which array element to wite power data into later
    const dt = new Date();
    setStartDate(dt);
  }, []);

  const connectToDeviceAndSubscribeToUpdates = async () => {
    // Search for Bluetooth devices that advertise a battery service
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ["00001826-0000-1000-8000-00805f9b34fb"] }],
    });

    setIsConnected(true);

    device.addEventListener("gattserverdisconnected", () =>
      setIsConnected(false)
    );

    const handleCharacteristicValueChanged = (event) => {
      // handle incoming value from trainer
      let dataview = new DataView(event.target.value.buffer);
      const val = dataview.getInt16(6, true);

      // work out which element of array needs the power data updating
      const current = new Date();
      const diff = Math.floor((current - startDate) / 1000).toString();

      // if the workout has finished stop adding data to the chart
      if (diff >= data.length) return;

      // otherwise set the current power in the array
      const prevState = data;
      prevState[diff] = { ...prevState[diff], power: val };
      console.log(prevState[diff]);
      setData([...prevState]);
      console.log(prevState[diff]['target']);
      let powertoset = prevState[diff]['target'];
      characteristic.writeValue(powerTarget({powertoset}));
      setTargetPowerLevel(powertoset);
      setSpeed(dataview.getUint16(2, true) / 100);
      setCadence(dataview.getUint16(4, true) * 0.5);
      setPower(dataview.getInt16(6, true));
    };

    const server = await device.gatt.connect();

    // Get the battery service from the Bluetooth device
    const service = await server.getPrimaryService(
      "00001826-0000-1000-8000-00805f9b34fb"
    );

    // Get the battery level characteristic from the Bluetooth device
    const characteristic = await service.getCharacteristic(
      "00002ad9-0000-1000-8000-00805f9b34fb"
    );

    // Subscribe to battery level notifications
    characteristic.startNotifications();

    // When the battery level changes, call a function
    characteristic.addEventListener(
      "characteristicvaluechanged",
      handleCharacteristicValueChanged
    );

    // get the 'Indoor Bike Data' characteristic which contains the features the device exposes
    const characteristicIndoorBikeData = await service.getCharacteristic(
      "00002ad2-0000-1000-8000-00805f9b34fb"
    );

    await characteristicIndoorBikeData.startNotifications();
    characteristicIndoorBikeData.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);

    function requestControl() {
      const OpCode = 0x00;
      let buffer   = new ArrayBuffer(1);
      let view     = new DataView(buffer);
      view.setUint8(0, OpCode, true);

      return view;
    }

    function powerTarget(args) {
        const OpCode = 0x05;
        const power = args.power;

        const buffer = new ArrayBuffer(3);
        const view   = new DataView(buffer);
        view.setUint8( 0, OpCode, true);
        view.setUint16(1, power,  true);

        return view;
    }

    await characteristic.startNotifications();

    const handleCharacteristicValueChangedTargetPower = (event) => {
      console.log(event);
    };

    characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicValueChangedTargetPower);
    await characteristic.writeValue(requestControl());
    let power = 100;
    setTargetPowerLevel(power);
    await characteristic.writeValue(powerTarget({power}));

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
      <table>
      <tr>
        <th>Speed</th>
        <th>Cadence</th>
        <th>Current Power</th>
        <th> ---------- </th>
        <th>Target Power</th>
      </tr>
        <tr>
          <td>{speed}</td>
          <td>{cadence}</td>
          <td>{power}</td>
          <td>              </td>
          <td>{targetPowerLevel}</td>
        </tr>
      </table>
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
