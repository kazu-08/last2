import React, { useState } from "react";
import axios from "axios";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import './stylee.css';

const App = () => {
  const [stations, setStations] = useState([]); // 入力された駅名
  const [input, setInput] = useState(""); // ユーザーの入力
  const [results, setResults] = useState([]); // 中間地点付近の駅
  const [error, setError] = useState(""); // エラーメッセージ
  const [midpoint, setMidpoint] = useState(null); // 中間地点
  const [mapCenter, setMapCenter] = useState({ lat: 35.6895, lng: 139.6917 }); // 初期の地図中心（東京）

  // 現在地を取得する関数
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setStations([
            ...stations,
            { name: "現在地", lat: latitude, lng: longitude },
          ]);
          setMapCenter({ lat: latitude, lng: longitude }); // 地図の中心を現在地に設定
          setInput(""); // 検索欄をクリア
        },
        (error) => {
          setError("現在地を取得できませんでした");
          console.error(error);
        }
      );
    } else {
      setError("このブラウザは位置情報に対応していません");
    }
  };
  

  // 駅をリストに追加
  const addStation = async () => {
    if (!input.trim()) return;
    try {
      const response = await axios.get(
        `https://express.heartrails.com/api/json?method=getStations&name=${input}`
      );
      const stationData = response.data.response.station;
      if (stationData && stationData.length > 0) {
        const station = stationData[0];
        setStations([
          ...stations,
          { name: station.name, lat: station.y, lng: station.x },
        ]);
        setMapCenter({ lat: parseFloat(station.y), lng: parseFloat(station.x) });
        setInput("");
        setError("");
      } else {
        setError("駅が見つかりませんでした");
      }
    } catch (err) {
      console.error(err);
      setError("データ取得中にエラーが発生しました");
    }
  };

  // 駅を削除する関数
  const removeStation = (index) => {
    setStations(stations.filter((_, i) => i !== index));
  };

  // 中間地点を計算
  const findMidpoints = async () => {
    if (stations.length < 2) {
      setError("少なくとも2つの駅を追加してください");
      return;
    }
    setError("");

    const midpoint = calculateMidpoint(
      stations.map((station) => ({
        lat: parseFloat(station.lat),
        lng: parseFloat(station.lng),
      }))
    );

    setMidpoint(midpoint);
    setMapCenter(midpoint);

    try {
      const response = await axios.get(
        `https://express.heartrails.com/api/json?method=getStations&x=${midpoint.lng}&y=${midpoint.lat}`
      );
      const nearbyStations = response.data.response.station;
      if (nearbyStations && nearbyStations.length > 0) {
        setResults(nearbyStations);
      } else {
        setError("中間地点付近の駅が見つかりませんでした");
      }
    } catch (err) {
      console.error(err);
      setError("データ取得中にエラーが発生しました");
    }
  };

  // 中間地点の計算ロジック
  const calculateMidpoint = (locations) => {
    const latSum = locations.reduce((sum, loc) => sum + loc.lat, 0);
    const lngSum = locations.reduce((sum, loc) => sum + loc.lng, 0);
    const midpointLat = latSum / locations.length;
    const midpointLng = lngSum / locations.length;

    return { lat: midpointLat, lng: midpointLng };
  };

  // 駅を検索するリンクを生成
  const searchStation = (stationName) => {
    const url = `https://www.google.com/search?q=${encodeURIComponent(
      stationName
    )}`;
    window.open(url, "_blank");
  };

  // リセット機能
  const resetData = () => {
    setStations([]);
    setResults([]);
    setInput("");
    setError("");
    setMidpoint(null);
    setMapCenter({ lat: 35.6895, lng: 139.6917 });
  };

  // エンターキーで追加
  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addStation();
    }
  };

  const googleMapsApiKey = "AIzaSyBCGMXvuWt5PfwgZfDIM06DYOTh_RLMB_A"; 

  return (
    <div style={{ padding: "20px" }}>
      <h1>中間地点の駅検索</h1>
      <div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="駅名を入力"
        />
        <button onClick={addStation}>追加</button>
        <button onClick={getCurrentLocation} style={{ marginLeft: "10px" }}>
          現在地を追加
        </button>
        <button onClick={resetData} style={{ marginLeft: "10px" }}>
          リセット
        </button>
      </div>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <ul>
        {stations.map((station, index) => (
          <li key={index}>
            <span
              style={{
                color: "blue",
                cursor: "pointer",
                textDecoration: "underline",
              }}
              onClick={() => searchStation(station.name)}
            >
              {station.name} ({station.lat}, {station.lng})
            </span>
            <button
              onClick={() => removeStation(index)}
              style={{ marginLeft: "10px", color: "red" }}
            >
              削除
            </button>
          </li>
        ))}
      </ul>
      <button onClick={findMidpoints} disabled={stations.length < 2}>
        中間地点を検索
      </button>
      <div>
        <h2>結果</h2>
        <ul>
          {results.map((station, index) => (
            <li key={index}>
              <span
                style={{
                  color: "blue",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
                onClick={() => searchStation(station.name)}
              >
                {station.name} ({station.line}線)
              </span>
            </li>
          ))}
        </ul>
      </div>

      <LoadScript googleMapsApiKey={googleMapsApiKey}>
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "400px" }}
          center={mapCenter}
          zoom={12}
        >
          {stations.map((station, index) => (
            <Marker
              key={index}
              position={{
                lat: parseFloat(station.lat),
                lng: parseFloat(station.lng),
              }}
              label={station.name}
            />
          ))}
          {midpoint && (
            <Marker
              position={midpoint}
              label="中間地点"
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: "blue",
                fillOpacity: 1,
                scale: 6,
                strokeColor: "white",
                strokeWeight: 2,
              }}
            />
          )}
        </GoogleMap>
      </LoadScript>
    </div>
  );
};

export default App;
