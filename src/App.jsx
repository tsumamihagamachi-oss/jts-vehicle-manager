import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const tagOptions = ["通常", "ポーズ", "ダンス", "小物", "共有", "上半身", "全身"];

function App() {
  const [activeTab, setActiveTab] = useState("list");
  const [searchText, setSearchText] = useState("");
  const [searchTags, setSearchTags] = useState([]);
  const [emotes, setEmotes] = useState([]);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const ACCESS_CODE = "JTS-EMOTE";

  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("jts-auth") === "ok"
  );

  const [accessCode, setAccessCode] = useState("");

  const [form, setForm] = useState({
    englishName: "",
    japaneseName: "",
    command: "",
    meaning: "",
    note: "",
    tags: [],
    image: "",
  });

  useEffect(() => {
    loadEmotes();
  }, []);

  async function loadEmotes() {
    const { data, error } = await supabase
      .from("emotes")
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
      englishName: item.english_name || "",
      japaneseName: item.japanese_name || "",
      command: item.command || "",
      tags: item.tags ? item.tags.split(",") : [],
      meaning: item.meaning || "",
      note: item.note || "",
    }));

    setEmotes(convertedData);
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
    const filePath = `emotes/${fileName}`;

    const { error } = await supabase.storage
      .from("emote-images")
      .upload(filePath, selectedImageFile);

    if (error) {
      console.error(error);
      alert("画像アップロードに失敗しました");
      return "";
    }

    const { data } = supabase.storage
      .from("emote-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const toggleFormTag = (tag) => {
    if (form.tags.includes(tag)) {
      setForm({ ...form, tags: form.tags.filter((t) => t !== tag) });
    } else {
      setForm({ ...form, tags: [...form.tags, tag] });
    }
  };

  const toggleSearchTag = (tag) => {
    if (searchTags.includes(tag)) {
      setSearchTags(searchTags.filter((t) => t !== tag));
    } else {
      setSearchTags([...searchTags, tag]);
    }
  };

  const resetForm = () => {
    setForm({
      englishName: "",
      japaneseName: "",
      command: "",
      meaning: "",
      note: "",
      tags: [],
      image: "",
    });
    setSelectedImageFile(null);
    setEditingId(null);
  };

  const saveEmote = async () => {
    if (!form.englishName || !form.japaneseName || !form.command) {
      alert("英語名・日本語名・コマンドは必須です");
      return;
    }

    const uploadedImageUrl = await uploadImageToStorage();

    const saveData = {
      english_name: form.englishName,
      japanese_name: form.japaneseName,
      command: form.command,
      meaning: form.meaning,
      note: form.note,
      tags: form.tags.join(","),
      image_url: uploadedImageUrl,
    };

    let error;

    if (editingId) {
      const result = await supabase
        .from("emotes")
        .update(saveData)
        .eq("id", editingId);

      error = result.error;
    } else {
      const result = await supabase.from("emotes").insert([saveData]);
      error = result.error;
    }

    if (error) {
      console.error(error);
      alert("保存に失敗しました");
      return;
    }

    resetForm();
    await loadEmotes();
    setActiveTab("list");
  };

  const editEmote = (emote) => {
    setEditingId(emote.id);
    setSelectedImageFile(null);

    setForm({
      englishName: emote.englishName,
      japaneseName: emote.japaneseName,
      command: emote.command,
      meaning: emote.meaning,
      note: emote.note,
      tags: emote.tags,
      image: emote.image,
    });

    setActiveTab("register");
  };

  const deleteEmote = async (id) => {
    const ok = confirm("このエモートを削除しますか？");
    if (!ok) return;

    const { error } = await supabase.from("emotes").delete().eq("id", id);

    if (error) {
      console.error(error);
      alert("削除に失敗しました");
      return;
    }

    await loadEmotes();
};

const login = () => {
  if (accessCode === ACCESS_CODE) {
    localStorage.setItem("jts-auth", "ok");
    setIsLoggedIn(true);
  } else {
    alert("アクセスコードが違います");
  }
};

const logout = () => {
  localStorage.removeItem("jts-auth");
  setIsLoggedIn(false);
};

const copyCommand = (command) => {
  navigator.clipboard.writeText(command);
  alert(`${command} をコピーしました`);
};

  const filteredEmotes = emotes.filter((emote) => {
    const text = searchText.toLowerCase();

    const matchText =
      (emote.englishName || "").toLowerCase().includes(text) ||
      (emote.japaneseName || "").toLowerCase().includes(text) ||
      (emote.command || "").toLowerCase().includes(text) ||
      (emote.meaning || "").toLowerCase().includes(text) ||
      (emote.note || "").toLowerCase().includes(text);

    const matchTags =
      searchTags.length === 0 ||
      searchTags.every((tag) => emote.tags.includes(tag));

    return matchText && matchTags;
  });

  const renderEmoteCard = (emote) => (
    <div className="emote-card" key={emote.id}>
      <div className="image-box">
        {emote.image ? (
          <img src={emote.image} alt={emote.japaneseName} className="emote-image" />
        ) : (
          <span>画像なし</span>
        )}
      </div>

      <h3>{emote.englishName} / {emote.japaneseName}</h3>
      <p className="command">{emote.command}</p>

      <div className="tag-list">
        {emote.tags.map((tag) => (
          <span className="tag" key={tag}>{tag}</span>
        ))}
      </div>

      <p className="meaning">{emote.meaning}</p>
      <p className="note">{emote.note}</p>

      <div className="copy-button" onClick={() => copyCommand(emote.command)}>
        コマンドコピー
      </div>

      <div className="card-actions">
        <div className="edit-button" onClick={() => editEmote(emote)}>編集</div>
        <div className="delete-button" onClick={() => deleteEmote(emote.id)}>削除</div>
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
          <h1 style={{ color: "white" }}>JTS Emote Manager</h1>

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
        <h2 className="logo">GTA Emote</h2>

        <div className={`menu-button ${activeTab === "list" ? "active" : ""}`} onClick={() => setActiveTab("list")}>
          📋 エモート一覧
        </div>

        <div className={`menu-button ${activeTab === "search" ? "active" : ""}`} onClick={() => setActiveTab("search")}>
          🔍 検索
        </div>

        <div className={`menu-button ${activeTab === "register" ? "active" : ""}`} onClick={() => setActiveTab("register")}>
          ➕ 登録
        </div>
      </aside>

      <main className="main">

        <div style={{ textAlign: "right", marginBottom: "10px" }}>
  <button onClick={logout}>
    ログアウト
  </button>
</div>

        <h1>GTA Emote Manager</h1>

        {activeTab === "list" && (
          <section>
            <h2 className="page-title">📋 エモート一覧</h2>
            <div className="card-grid">
              {emotes.map((emote) => renderEmoteCard(emote))}
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
                placeholder="英語名・日本語名・コマンド・意味・備考で検索"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />

              <div className="tag-select-area">
                <p>タグ検索（複数選択可）</p>
                {tagOptions.map((tag) => (
                  <div
                    className={`tag-button ${searchTags.includes(tag) ? "selected" : ""}`}
                    key={tag}
                    onClick={() => toggleSearchTag(tag)}
                  >
                    {tag}
                  </div>
                ))}
              </div>

              <div className="search-actions">
                <div className="clear-button" onClick={() => {
                  setSearchText("");
                  setSearchTags([]);
                }}>
                  検索条件をリセット
                </div>

                <p className="result-count">検索結果：{filteredEmotes.length}件</p>
              </div>
            </div>

            <div className="card-grid search-result-grid">
              {filteredEmotes.map((emote) => renderEmoteCard(emote))}
            </div>
          </section>
        )}

        {activeTab === "register" && (
          <section className="panel">
            <h2 className="page-title">
              {editingId ? "✏️ エモート編集" : "➕ 登録"}
            </h2>

            <div className="form-grid">
              <input className="text-input" placeholder="エモート名（英語）" value={form.englishName} onChange={(e) => handleChange("englishName", e.target.value)} />
              <input className="text-input" placeholder="エモート名（日本語）" value={form.japaneseName} onChange={(e) => handleChange("japaneseName", e.target.value)} />
              <input className="text-input" placeholder="コマンド 例：/e dance" value={form.command} onChange={(e) => handleChange("command", e.target.value)} />
              <input className="text-input" placeholder="意味" value={form.meaning} onChange={(e) => handleChange("meaning", e.target.value)} />
              <textarea className="text-area" placeholder="備考" value={form.note} onChange={(e) => handleChange("note", e.target.value)} />

              <div className="tag-select-area">
                <p>タグ（複数選択可）</p>
                {tagOptions.map((tag) => (
                  <div
                    className={`tag-button ${form.tags.includes(tag) ? "selected" : ""}`}
                    key={tag}
                    onClick={() => toggleFormTag(tag)}
                  >
                    {tag}
                  </div>
                ))}
              </div>

              <input className="file-input" type="file" accept="image/*" onChange={handleImageChange} />

              {form.image && (
                <div className="preview-box">
                  <p>画像プレビュー</p>
                  <img src={form.image} alt="プレビュー" className="preview-image" />
                </div>
              )}

              <div className="save-button" onClick={saveEmote}>
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