import React, { useState } from "react";
import axios from "axios";

const App = () => {
  const [stations, setStations] = useState([]); // 入力された駅のリスト
  const [input, setInput] = useState(""); // 入力欄の値
  const [results, setResults] = useState([]); // 中間地点の検索結果
  const [error, setError] = useState(""); // エラーメッセージ
  const [map, setMap] = useState(null); // Googleマップのインスタンス

  // 駅をリストに追加する
  const addStation = async () => {
    if (!input.trim()) return;

    try {
      const response = await axios.get(
        `https://express.heartrails.com/api/json?method=getStations&name=${input}`
      );
      const stationData = response.data.response.station;
      if (stationData && stationData.length > 0) {
        setStations([...stations, stationData[0]]);
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

  // 中間地点を計算してGoogleマップAPIで経路情報を取得
  const findMidpoints = async () => {
    if (stations.length < 2) {
      setError("少なくとも2つの駅を追加してください");
      return;
    }
    setError("");

    const midpoint = calculateMidpoint(
      stations.map((station) => ({
        lat: parseFloat(station.y),
        lng: parseFloat(station.x),
      }))
    );

    try {
      const waypoints = stations
        .slice(1, stations.length - 1)
        .map((station) => ({
          location: `${station.y},${station.x}`,
          stopover: true,
        }));

      const origin = `${stations[0].y},${stations[0].x}`;
      const destination = `${stations[stations.length - 1].y},${stations[stations.length - 1].x}`;

      const directionsResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/directions/json`,
        {
          params: {
            origin,
            destination,
            waypoints: waypoints.length > 0 ? waypoints.map((wp) => wp.location).join("|") : null,
            key: "YOUR_GOOGLE_MAP_API_KEY",
          },
        }
      );

      const routes = directionsResponse.data.routes;
      if (routes && routes.length > 0) {
        const legs = routes[0].legs;
        const totalDuration = legs.reduce((sum, leg) => sum + leg.duration.value, 0);
        const totalTransfers = legs.length - 1;

        setResults([
          {
            midpoint: midpoint,
            duration: totalDuration,
            transfers: totalTransfers,
          },
        ]);

        if (map) {
          new window.google.maps.Marker({
            position: midpoint,
            map: map,
            title: `中間地点: ${Math.floor(totalDuration / 60)}分`,
          });
          map.setCenter(midpoint);
        }
      } else {
        setError("経路情報が見つかりませんでした");
      }
    } catch (err) {
      console.error(err);
      setError("経路情報の取得中にエラーが発生しました");
    }
  };

  // 中間地点を計算
  const calculateMidpoint = (locations) => {
    const latSum = locations.reduce((sum, loc) => sum + loc.lat, 0);
    const lngSum = locations.reduce((sum, loc) => sum + loc.lng, 0);
    return {
      lat: latSum / locations.length,
      lng: lngSum / locations.length,
    };
  };

  // Googleマップの初期化
  const initializeMap = () => {
    const mapOptions = {
      center: { lat: 35.682839, lng: 139.759455 }, // 初期位置: 東京駅
      zoom: 12,
    };
    const googleMap = new window.google.maps.Map(document.getElementById("map"), mapOptions);
    setMap(googleMap);
  };

  React.useEffect(() => {
    if (window.google && window.google.maps) {
      initializeMap();
    } else {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?AIzaSyBOQrYnnHE7aJNnlupzaTed5r3mSYvOvD4`;
      script.async = true;
      script.onload = () => initializeMap();
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>中間地点の駅検索</h1>
      <div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="駅名を入力"
        />
        <button onClick={addStation}>追加</button>
      </div>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <ul>
        {stations.map((station, index) => (
          <li key={index}>
            {station.name} ({station.line}線)
          </li>
        ))}
      </ul>
      <button onClick={findMidpoints} disabled={stations.length < 2}>
        中間地点を検索
      </button>
      <div>
        <h2>結果</h2>
        <ul>
          {results.map((result, index) => (
            <li key={index}>
              中間地点: 緯度 {result.midpoint.lat.toFixed(5)}, 経度 {result.midpoint.lng.toFixed(5)} | 
              所要時間: {Math.floor(result.duration / 60)}分 | 乗り換え回数: {result.transfers}回
            </li>
          ))}
        </ul>
      </div>
      <div id="map" style={{ width: "100%", height: "500px" }}></div>
    </div>
  );
};

export default App;
