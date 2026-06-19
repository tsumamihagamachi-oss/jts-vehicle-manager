import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const tagOptions = ["コンパクト", "クーペ", "セダン", "SUV", "スーパーカー", "バイク", "船"];
const gripOptions = ["非常に安定", "安定", "普通", "滑りやすい"];

function App() {
  const [activeTab, setActiveTab] = useState("list");
  const [searchText, setSearchText] = useState("");
  const [searchTag, setSearchTag] = useState("");
  const [sortType, setSortType] = useState("id");
  const [vehicles, setVehicles] = useState([]);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const ACCESS_CODE = "JTS-VEHICLE";

  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("jts-vehicle-auth") === "ok"
  );

  const [accessCode, setAccessCode] = useState("");

  const [form, setForm] = useState({
    vehicleName: "",
    vehicleKana: "",
    price: "",
    acceleration1: "",
    acceleration2: "",
    topSpeed: "",
    grip: "普通",
    loadCapacity: "",
    note: "",
    tag: "",
    image: "",
  });

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error(error);
      alert("データの読み込みに失敗しました");
      return;
    }

    const convertedData = data.map((item) => ({
      id: item.id,
      image: item.image_url || "",
      vehicleName: item.vehicle_name || "",
      vehicleKana: item.vehicle_kana || "",
      price: item.price || "",
      acceleration1: item.acceleration_1 || "",
      acceleration2: item.acceleration_2 || "",
      topSpeed: item.top_speed || "",
      grip: item.grip || "普通",
      loadCapacity: item.load_capacity || "",
      note: item.note || "",
      tag: item.tags || "",
    }));

    setVehicles(convertedData);
  }

  const handleChange = (key, value) => {
    setForm({ ...form, [key]: value });
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedImageFile(file);
    setForm({ ...form, image: URL.createObjectURL(file) });
  };

  const uploadImageToStorage = async () => {
    if (!selectedImageFile) return form.image || "";

    const fileExt = selectedImageFile.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `vehicles/${fileName}`;

    const { error } = await supabase.storage
      .from("vehicle-images")
      .upload(filePath, selectedImageFile);

    if (error) {
      console.error(error);
      alert("画像アップロードに失敗しました");
      return "";
    }

    const { data } = supabase.storage
      .from("vehicle-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const selectFormTag = (tag) => {
    setForm({ ...form, tag });
  };

  const selectSearchTag = (tag) => {
    if (searchTag === tag) {
      setSearchTag("");
    } else {
      setSearchTag(tag);
    }
  };

  const resetForm = () => {
    setForm({
      vehicleName: "",
      vehicleKana: "",
      price: "",
      acceleration1: "",
      acceleration2: "",
      topSpeed: "",
      grip: "普通",
      loadCapacity: "",
      note: "",
      tag: "",
      image: "",
    });

    setSelectedImageFile(null);
    setEditingId(null);
  };

  const saveVehicle = async () => {
    if (!form.vehicleName || !form.vehicleKana) {
      alert("車名（英語）と車名（カタカナ）は必須です");
      return;
    }

    const uploadedImageUrl = await uploadImageToStorage();

    const saveData = {
      vehicle_name: form.vehicleName,
      vehicle_kana: form.vehicleKana,
      price: form.price,
      acceleration_1: form.acceleration1,
      acceleration_2: form.acceleration2,
      top_speed: form.topSpeed,
      grip: form.grip,
      load_capacity: form.loadCapacity,
      note: form.note,
      tags: form.tag,
      image_url: uploadedImageUrl,
    };

    let error;

    if (editingId) {
      const result = await supabase
        .from("vehicles")
        .update(saveData)
        .eq("id", editingId);

      error = result.error;
    } else {
      const result = await supabase.from("vehicles").insert([saveData]);
      error = result.error;
    }

    if (error) {
      console.error(error);
      alert("保存に失敗しました");
      return;
    }

    resetForm();
    await loadVehicles();
    setActiveTab("list");
  };

  const editVehicle = (vehicle) => {
    setEditingId(vehicle.id);
    setSelectedImageFile(null);

    setForm({
      vehicleName: vehicle.vehicleName,
      vehicleKana: vehicle.vehicleKana,
      price: vehicle.price,
      acceleration1: vehicle.acceleration1,
      acceleration2: vehicle.acceleration2,
      topSpeed: vehicle.topSpeed,
      grip: vehicle.grip,
      loadCapacity: vehicle.loadCapacity,
      note: vehicle.note,
      tag: vehicle.tag,
      image: vehicle.image,
    });

    setActiveTab("register");
  };

  const deleteVehicle = async (id) => {
    const ok = confirm("この車両を削除しますか？");
    if (!ok) return;

    const { error } = await supabase.from("vehicles").delete().eq("id", id);

    if (error) {
      console.error(error);
      alert("削除に失敗しました");
      return;
    }

    await loadVehicles();
  };

  const login = () => {
    if (accessCode === ACCESS_CODE) {
      localStorage.setItem("jts-vehicle-auth", "ok");
      setIsLoggedIn(true);
    } else {
      alert("アクセスコードが違います");
    }
  };

  const logout = () => {
    localStorage.removeItem("jts-vehicle-auth");
    setIsLoggedIn(false);
  };

  const filteredVehicles = vehicles.filter((vehicle) => {
    const text = searchText.toLowerCase();

    const matchText =
      (vehicle.vehicleName || "").toLowerCase().includes(text) ||
      (vehicle.vehicleKana || "").toLowerCase().includes(text) ||
      (vehicle.price || "").toLowerCase().includes(text) ||
      (vehicle.acceleration1 || "").toLowerCase().includes(text) ||
      (vehicle.acceleration2 || "").toLowerCase().includes(text) ||
      (vehicle.topSpeed || "").toLowerCase().includes(text) ||
      (vehicle.grip || "").toLowerCase().includes(text) ||
      (vehicle.loadCapacity || "").toLowerCase().includes(text) ||
      (vehicle.note || "").toLowerCase().includes(text);

    const matchTags = searchTag === "" || vehicle.tag === searchTag;

    return matchText && matchTags;
  });

  const getNumber = (value) => {
    const number = Number(String(value || "").replace(/,/g, ""));
    return isNaN(number) ? 0 : number;
  };

  const sortedVehicles = [...filteredVehicles].sort((a, b) => {
    if (sortType === "vehicleName") {
      return a.vehicleName.localeCompare(b.vehicleName);
    }

    if (sortType === "priceLow") {
      return getNumber(a.price) - getNumber(b.price);
    }

    if (sortType === "priceHigh") {
      return getNumber(b.price) - getNumber(a.price);
    }

    if (sortType === "topSpeedHigh") {
      return getNumber(b.topSpeed) - getNumber(a.topSpeed);
    }

    if (sortType === "loadCapacityHigh") {
      return getNumber(b.loadCapacity) - getNumber(a.loadCapacity);
    }

    return a.id - b.id;
  });

  const renderVehicleCard = (vehicle) => (
    <div className="emote-card" key={vehicle.id}>
      <div className="image-box">
        {vehicle.image ? (
          <img
            src={vehicle.image}
            alt={vehicle.vehicleName}
            className="emote-image"
          />
        ) : (
          <span>画像なし</span>
        )}
      </div>

      <h3>
        {vehicle.vehicleName} / {vehicle.vehicleKana}
      </h3>

      <p className="command">価格：{vehicle.price}</p>

      <div className="tag-list">
        {vehicle.tag && <span className="tag">{vehicle.tag}</span>}
      </div>

      <p className="meaning">加速①：{vehicle.acceleration1}</p>
      <p className="meaning">加速②：{vehicle.acceleration2}</p>
      <p className="meaning">トップスピード：{vehicle.topSpeed}</p>
      <p className="meaning">グリップ：{vehicle.grip}</p>
      <p className="meaning">積載量：{vehicle.loadCapacity}</p>
      <p className="note">{vehicle.note}</p>

      <div className="card-actions">
        <div className="edit-button" onClick={() => editVehicle(vehicle)}>
          編集
        </div>
        <div className="delete-button" onClick={() => deleteVehicle(vehicle.id)}>
          削除
        </div>
      </div>
    </div>
  );

  if (!isLoggedIn) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#0f172a",
        }}
      >
        <div
          style={{
            background: "#1e293b",
            padding: "30px",
            borderRadius: "12px",
            width: "400px",
            textAlign: "center",
          }}
        >
          <h1 style={{ color: "white" }}>JTS Vehicle Manager</h1>

          <p style={{ color: "#cbd5e1" }}>
            アクセスコードを入力してください
          </p>

          <input
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="アクセスコード"
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "10px",
            }}
          />

          <button
            onClick={login}
            style={{
              marginTop: "15px",
              width: "100%",
              padding: "10px",
              cursor: "pointer",
            }}
          >
            ログイン
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h2 className="logo">JTS Vehicle</h2>

        <div
          className={`menu-button ${activeTab === "list" ? "active" : ""}`}
          onClick={() => setActiveTab("list")}
        >
          📋 車両一覧
        </div>

        <div
          className={`menu-button ${activeTab === "search" ? "active" : ""}`}
          onClick={() => setActiveTab("search")}
        >
          🔍 検索
        </div>

        <div
          className={`menu-button ${activeTab === "register" ? "active" : ""}`}
          onClick={() => setActiveTab("register")}
        >
          ➕ 登録
        </div>
      </aside>

      <main className="main">
        <div style={{ textAlign: "right", marginBottom: "10px" }}>
          <button onClick={logout}>ログアウト</button>
        </div>

        <h1>JTS Vehicle Manager</h1>

        {activeTab === "list" && (
          <section>
            <h2 className="page-title">📋 車両一覧</h2>

            <select
              className="text-input"
              value={sortType}
              onChange={(e) => setSortType(e.target.value)}
              style={{ marginBottom: "15px" }}
            >
              <option value="id">登録順</option>
              <option value="vehicleName">車名順</option>
              <option value="priceLow">価格が安い順</option>
              <option value="priceHigh">価格が高い順</option>
              <option value="topSpeedHigh">トップスピード順</option>
              <option value="loadCapacityHigh">積載量順</option>
            </select>

            <div className="card-grid">
              {sortedVehicles.map((vehicle) => renderVehicleCard(vehicle))}
            </div>
          </section>
        )}

        {activeTab === "search" && (
          <section>
            <div className="panel search-panel">
              <h2 className="page-title">🔍 検索</h2>

              <input
                className="text-input"
                type="text"
                placeholder="車名・価格・加速・トップスピード・グリップ・積載量・備考で検索"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />

              <select
                className="text-input"
                value={sortType}
                onChange={(e) => setSortType(e.target.value)}
              >
                <option value="id">登録順</option>
                <option value="vehicleName">車名順</option>
                <option value="priceLow">価格が安い順</option>
                <option value="priceHigh">価格が高い順</option>
                <option value="topSpeedHigh">トップスピード順</option>
                <option value="loadCapacityHigh">積載量順</option>
              </select>

              <div className="tag-select-area">
                <p>タグ検索（1つ選択）</p>

                {tagOptions.map((tag) => (
                  <div
                    className={`tag-button ${
                      searchTag === tag ? "selected" : ""
                    }`}
                    key={tag}
                    onClick={() => selectSearchTag(tag)}
                  >
                    {tag}
                  </div>
                ))}
              </div>

              <div className="search-actions">
                <div
                  className="clear-button"
                  onClick={() => {
                    setSearchText("");
                    setSearchTag("");
                    setSortType("id");
                  }}
                >
                  検索条件をリセット
                </div>

                <p className="result-count">
                  検索結果：{sortedVehicles.length}件
                </p>
              </div>
            </div>

            <div className="card-grid search-result-grid">
              {sortedVehicles.map((vehicle) => renderVehicleCard(vehicle))}
            </div>
          </section>
        )}

        {activeTab === "register" && (
          <section className="panel">
            <h2 className="page-title">
              {editingId ? "✏️ 車両編集" : "➕ 車両登録"}
            </h2>

            <div className="form-grid">
              <input
                className="text-input"
                placeholder="車名（英語）"
                value={form.vehicleName}
                onChange={(e) => handleChange("vehicleName", e.target.value)}
              />

              <input
                className="text-input"
                placeholder="車名（カタカナ）"
                value={form.vehicleKana}
                onChange={(e) => handleChange("vehicleKana", e.target.value)}
              />

              <input
                className="text-input"
                placeholder="価格"
                value={form.price}
                onChange={(e) => handleChange("price", e.target.value)}
              />

              <input
                className="text-input"
                placeholder="加速①"
                value={form.acceleration1}
                onChange={(e) => handleChange("acceleration1", e.target.value)}
              />

              <input
                className="text-input"
                placeholder="加速②"
                value={form.acceleration2}
                onChange={(e) => handleChange("acceleration2", e.target.value)}
              />

              <input
                className="text-input"
                placeholder="トップスピード"
                value={form.topSpeed}
                onChange={(e) => handleChange("topSpeed", e.target.value)}
              />

              <select
                className="text-input"
                value={form.grip}
                onChange={(e) => handleChange("grip", e.target.value)}
              >
                {gripOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <input
                className="text-input"
                placeholder="積載量"
                value={form.loadCapacity}
                onChange={(e) => handleChange("loadCapacity", e.target.value)}
              />

              <textarea
                className="text-area"
                placeholder="備考"
                value={form.note}
                onChange={(e) => handleChange("note", e.target.value)}
              />

              <div className="tag-select-area">
                <p>タグ（1つ選択）</p>

                {tagOptions.map((tag) => (
                  <div
                    className={`tag-button ${
                      form.tag === tag ? "selected" : ""
                    }`}
                    key={tag}
                    onClick={() => selectFormTag(tag)}
                  >
                    {tag}
                  </div>
                ))}
              </div>

              <input
                className="file-input"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />

              {form.image && (
                <div className="preview-box">
                  <p>画像プレビュー</p>
                  <img
                    src={form.image}
                    alt="プレビュー"
                    className="preview-image"
                  />
                </div>
              )}

              <div className="save-button" onClick={saveVehicle}>
                {editingId ? "更新する" : "登録する"}
              </div>

              {editingId && (
                <div className="cancel-button" onClick={resetForm}>
                  編集をキャンセル
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;