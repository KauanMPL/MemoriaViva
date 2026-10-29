
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { api } from "./src/services/api";
import styles from "./src/theme/styles";
import { LoadingScreen } from "./src/components/ui";
import { AppLayout } from "./src/components/AppLayout";
import { Alert, Platform } from "react-native";

import {
  Welcome,
  Auth,
  FamilySetup,
} from "./src/screens/Onboarding";

import {
  Dashboard,
  Timeline,
  ChapterForm,
  ChapterDetail,
} from "./src/screens/Memories";

import {
  Members,
  Settings,
} from "./src/screens/Account";

import { Profile } from "./src/screens/Profile";

export default function App() {
  const [booting, setBooting] = useState(true);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [family, setFamily] = useState(null);
  const [members, setMembers] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [screen, setScreen] = useState("welcome");
  const [selected, setSelected] = useState(null);
  const [authMode, setAuthMode] = useState("login");

  const refreshFamily = async (
    familyId = family?.id,
    activeToken = token
  ) => {
    if (!familyId || !activeToken) return;

    const result = await api(
      `/api/families/${familyId}`,
      activeToken
    );

    setFamily(result.family);
    setMembers(result.members || []);
    setChapters(result.chapters || []);

    setSelected((current) =>
      current
        ? (result.chapters || []).find(
          (item) => item.id === current.id
        ) || current
        : current
    );

    return result;
  };

  const loadSession = async (savedToken) => {
    try {
      const me = await api("/api/auth/me", savedToken);

      setToken(savedToken);
      setUser(me.user);

      if (me.families?.[0]) {
        await refreshFamily(
          me.families[0].id,
          savedToken
        );

        setScreen("home");
      } else {
        setScreen("createFamily");
      }
    } catch (error) {
      try {
        await AsyncStorage.removeItem("mv_token");
      } catch (storageError) {
        console.error(
          "Erro ao remover sessão inválida:",
          storageError
        );
      }

      setToken(null);
      setUser(null);
      setFamily(null);
      setMembers([]);
      setChapters([]);
      setSelected(null);
      setScreen("welcome");
    } finally {
      setBooting(false);
    }
  };

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      try {
        const savedToken = await AsyncStorage.getItem("mv_token");

        if (!active) return;

        if (savedToken) {
          await loadSession(savedToken);
        } else {
          setBooting(false);
        }
      } catch (error) {
        console.error(
          "Erro ao carregar sessão:",
          error
        );

        if (active) {
          setToken(null);
          setUser(null);
          setScreen("welcome");
          setBooting(false);
        }
      }
    };

    initialize();

    return () => {
      active = false;
    };
  }, []);

  // Logout local: não depende da resposta do backend.
  const logout = async () => {
    // Limpa a sessão imediatamente na interface
    setToken(null);
    setUser(null);
    setFamily(null);
    setMembers([]);
    setChapters([]);
    setSelected(null);
    setAuthMode("login");
    setScreen("welcome");

    // Remove a sessão salva no dispositivo
    try {
      await AsyncStorage.removeItem("mv_token");
    } catch (error) {
      console.error("Erro ao remover token:", error);
    }
  };

  const authSuccess = async (result) => {
    try {
      await AsyncStorage.setItem(
        "mv_token",
        result.token
      );

      setToken(result.token);
      setUser(result.user);

      if (result.families?.[0]) {
        await refreshFamily(
          result.families[0].id,
          result.token
        );

        setScreen("home");
      } else {
        setFamily(null);
        setScreen("createFamily");
      }
    } catch (error) {
      Alert.alert(
        "Erro ao entrar",
        error?.message ||
        "Não foi possível iniciar sua sessão."
      );
    }
  };

  const familyCreated = async (newFamily) => {
    await refreshFamily(newFamily.id, token);
    setScreen("home");
  };

  const openChapter = (chapter) => {
    setSelected(chapter);
    setScreen("chapter");
  };

  const deleteChapter = async () => {
    if (!selected?.id) return;

    try {
      await api(
        `/api/chapters/${selected.id}`,
        token,
        { method: "DELETE" }
      );

      await refreshFamily();

      setSelected(null);
      setScreen("timeline");
    } catch (error) {
      Alert.alert(
        "Não foi possível excluir",
        error?.message || "Ocorreu um erro ao excluir a memória."
      );
    }
  };

  if (booting) {
    return <LoadingScreen />;
  }

  if (!token || !user) {
    if (screen === "auth") {
      return (
        <Auth
          mode={authMode}
          onBack={(mode) =>
            mode
              ? setAuthMode(mode)
              : setScreen("welcome")
          }
          onSuccess={authSuccess}
        />
      );
    }

    return (
      <Welcome
        onLogin={() => {
          setAuthMode("login");
          setScreen("auth");
        }}
        onRegister={() => {
          setAuthMode("register");
          setScreen("auth");
        }}
      />
    );
  }

  if (screen === "createFamily" || !family) {
    return (
      <FamilySetup
        token={token}
        user={user}
        onCreated={familyCreated}
      />
    );
  }

  if (screen === "chapter") {
    return (
      <ChapterDetail
        chapter={selected}
        token={token}
        onBack={() => setScreen("timeline")}
        onRefresh={() => refreshFamily()}
        onEdit={() => setScreen("editChapter")}
        onDelete={deleteChapter}
      />
    );
  }

  if (
    screen === "newChapter" ||
    screen === "editChapter"
  ) {
    return (
      <ChapterForm
        family={family}
        token={token}
        members={members}
        existing={
          screen === "editChapter"
            ? selected
            : undefined
        }
        onBack={() =>
          setScreen(
            screen === "editChapter"
              ? "chapter"
              : "home"
          )
        }
        onSaved={async () => {
          await refreshFamily();
          setScreen("timeline");
        }}
      />
    );
  }

  let content;

  switch (screen) {
    case "home":
      content = (
        <Dashboard
          family={family}
          chapters={chapters}
          members={members}
          setScreen={setScreen}
          openChapter={openChapter}
          onAdd={() => setScreen("newChapter")}
        />
      );
      break;

    case "timeline":
      content = (
        <Timeline
          chapters={chapters}
          members={members}
          setScreen={setScreen}
          openChapter={openChapter}
          onAdd={() => setScreen("newChapter")}
        />
      );
      break;

    case "members":
      content = (
        <Members
          family={family}
          token={token}
          members={members}
          onRefresh={() => refreshFamily()}
        />
      );
      break;

    case "profile":
      content = (
        <Profile
          user={user}
          family={family}
          members={members}
          chapters={chapters}
          token={token}
          onLogout={logout}
          onUserUpdated={setUser}
        />
      );
      break;

    case "settings":
      content = (
        <Settings
          family={family}
          token={token}
          onFamilyUpdated={setFamily}
          onLogout={logout}
        />
      );
      break;

    default:
      content = (
        <Dashboard
          family={family}
          chapters={chapters}
          members={members}
          setScreen={setScreen}
          openChapter={openChapter}
          onAdd={() => setScreen("newChapter")}
        />
      );
  }

  return (
    <AppLayout
      user={user}
      family={family}
      screen={screen}
      setScreen={setScreen}
      onLogout={logout}
      onAdd={() => setScreen("newChapter")}
    >
      {content}
    </AppLayout>
  );
}
