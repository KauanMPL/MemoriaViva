
import React from "react";
import {
  Pressable,
  SafeAreaView,
  StatusBar,
  Text,
  View,
} from "react-native";

import { COLORS, initials } from "../services/api";
import styles from "../theme/styles";
import { Icon, Avatar } from "./ui";

export function Header({ user, family, setScreen }) {
  const userName = user?.name || user?.nome || "Usuário";
  const familyName = family?.name || "Memória Viva";
  const photoUrl = user?.photoUrl || user?.foto_perfil || null;

  const openProfile = () => {
    if (typeof setScreen === "function") {
      setScreen("profile");
    }
  };

  return (
    <View style={styles.appHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.eyebrow}>FAMÍLIA ATIVA</Text>

        <Text
          style={styles.headerTitle}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {familyName}
        </Text>
      </View>

      <Pressable
        onPress={openProfile}
        accessibilityRole="button"
        accessibilityLabel="Abrir meu perfil"
        accessibilityHint="Acesse seus dados pessoais e sua foto de perfil"
        accessibilityState={{ disabled: typeof setScreen !== "function" }}
        disabled={typeof setScreen !== "function"}
        hitSlop={10}
        style={({ pressed }) => ({
          opacity: pressed ? 0.7 : 1,
          borderRadius: 50,
        })}
      >
        <Avatar
          text={initials(userName)}
          photoUrl={photoUrl}
          color={COLORS.terracotta}
        />
      </Pressable>
    </View>
  );
}

export function Tabs({ current, setScreen }) {
  const tabs = [
    { key: "home", label: "Início", icon: "home" },
    { key: "timeline", label: "Timeline", icon: "clock" },
    { key: "members", label: "Membros", icon: "users" },
    { key: "settings", label: "Ajustes", icon: "settings" },
    { key: "profile", label: "Perfil", icon: "user" },
  ];

  return (
    <View style={styles.tabs}>
      {tabs.map((tab) => {
        const active = current === tab.key;

        return (
          <Pressable
            key={tab.key}
            onPress={() => setScreen(tab.key)}
            style={({ pressed }) => [
              styles.tab,
              { opacity: pressed ? 0.65 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active }}
            hitSlop={5}
          >
            <Icon
              name={tab.icon}
              size={19}
              color={active ? COLORS.teal : "#9aa8a2"}
            />

            <Text
              style={[
                styles.tabText,
                active && styles.tabTextActive,
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function AppLayout({
  children,
  user,
  family,
  screen,
  setScreen,
  onLogout,
  onAdd,
}) {
  return (
    <SafeAreaView style={styles.appSafe}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.paper}
      />

      <View style={styles.appBody}>
        <Header
          user={user}
          family={family}
          setScreen={setScreen}
        />

        <View style={styles.appContent}>
          {children}
        </View>

        <Tabs
          current={screen}
          setScreen={setScreen}
        />

        <Pressable
          style={({ pressed }) => [
            styles.fab,
            { opacity: pressed ? 0.75 : 1 },
          ]}
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel="Adicionar memória"
          accessibilityHint="Criar um novo capítulo de memória"
          disabled={typeof onAdd !== "function"}
          hitSlop={8}
        >
          <Icon
            name="plus"
            color={COLORS.white}
            size={22}
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
