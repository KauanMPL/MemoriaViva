
import React from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS, assetUrl } from "../services/api";
import styles from "../theme/styles";

export function Icon({ name, size = 18, color = COLORS.ink }) {
  return <Feather name={name} size={size} color={color} />;
}

export function Logo({ light = false }) {
  return (
    <View style={styles.logo}>
      <View style={[styles.logoMark, light && { borderColor: COLORS.white }]}>
        <View
          style={[
            styles.logoLine,
            { transform: [{ rotate: "35deg" }], top: 9 },
          ]}
        />
        <View
          style={[
            styles.logoLine,
            { transform: [{ rotate: "-35deg" }], top: 15, left: 8 },
          ]}
        />
      </View>

      <Text style={[styles.logoText, light && { color: COLORS.white }]}>
        memória <Text style={styles.logoItalic}>viva</Text>
      </Text>
    </View>
  );
}

export function Button({
  children,
  onPress,
  variant = "primary",
  icon,
  loading = false,
  disabled = false,
  small = false,
}) {
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        variant === "outline" && styles.buttonOutline,
        variant === "quiet" && styles.buttonQuiet,
        variant === "danger" && styles.buttonDanger,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? COLORS.white : COLORS.teal}
        />
      ) : (
        <>
          {children && (
            <Text
              style={[
                styles.buttonText,
                variant !== "primary" && styles.buttonTextDark,
              ]}
            >
              {children}
            </Text>
          )}

          {icon && (
            <Icon
              name={icon}
              size={small ? 15 : 17}
              color={variant === "primary" ? COLORS.white : COLORS.teal}
            />
          )}
        </>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  multiline = false,
  keyboardType = "default",
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#a1aca6"
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[styles.input, multiline && styles.textarea]}
      />
    </View>
  );
}

export function Screen({ children, scroll = true }) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.paper} />

      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.screenContent}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </SafeAreaView>
  );
}

export function TopBar({ title, onBack, action }) {
  return (
    <View style={styles.topBar}>
      {onBack ? (
        <Pressable style={styles.backButton} onPress={onBack}>
          <Icon name="arrow-left" size={20} color={COLORS.teal} />
        </Pressable>
      ) : (
        <Logo />
      )}

      {title && <Text style={styles.topTitle}>{title}</Text>}
      {action || <View style={{ width: 36 }} />}
    </View>
  );
}

export function LoadingScreen() {
  return (
    <View style={styles.centerScreen}>
      <Logo />
      <ActivityIndicator style={{ marginTop: 22 }} color={COLORS.teal} />
      <Text style={styles.loadingText}>abrindo suas memórias…</Text>
    </View>
  );
}

export function EmptyState({ onCreate }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name="star" size={22} color={COLORS.teal} />
      </View>

      <Text style={styles.emptyTitle}>
        O primeiro capítulo começa com você.
      </Text>

      <Text style={styles.emptyText}>
        Adicione uma lembrança, uma foto ou uma história que merece ser
        guardada.
      </Text>

      <Button onPress={onCreate} icon="arrow-right">
        Criar primeira memória
      </Button>
    </View>
  );
}

export function Avatar({
  text,
  color = "#62898a",
  small = false,
  photoUrl = null,
}) {
  const imageUrl = photoUrl ? assetUrl(photoUrl) : null;

  return (
    <View
      style={[
        styles.avatar,
        small && styles.avatarSmall,
        {
          backgroundColor: color,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
        },
      ]}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 999,
          }}
          resizeMode="cover"
        />
      ) : (
        <Text style={styles.avatarText}>{text}</Text>
      )}
    </View>
  );
}

export function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function Filter({ active, label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.filter, active && styles.filterActive]}
    >
      <Text style={[styles.filterText, active && styles.filterTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}
