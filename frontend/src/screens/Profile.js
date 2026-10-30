import React, { useState } from "react";
import { Platform } from "react-native";
import {
  Alert,
  Image,
  Text,
  TextInput,
  View,
  Pressable,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import { api, COLORS, initials, assetUrl } from "../services/api";
import styles from "../theme/styles";
import { Screen, Button, Icon, Avatar } from "../components/ui";

export function Profile({
  user,
  family,
  members = [],
  chapters = [],
  token,
  onUserUpdated,
  onLogout,
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || user?.nome || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const displayName = user?.name || user?.nome || "Usuário";
  const displayEmail = user?.email || "E-mail não informado";
  const photoUrl = user?.photoUrl || user?.foto_perfil || null;

  const confirmLogout = () => {
    if (typeof onLogout === "function") {
      onLogout();
    }
  };

  const saveProfile = async () => {
    if (name.trim().length < 2) {
      Alert.alert("Nome inválido", "Informe seu nome completo.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert("E-mail inválido", "Informe um endereço de e-mail válido.");
      return;
    }

    try {
      setSaving(true);

      const result = await api("/api/auth/profile", token, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
        }),
      });

      onUserUpdated?.(result.user);
      setName(result.user.name || "");
      setEmail(result.user.email || "");
      setEditing(false);

      Alert.alert("Perfil atualizado", "Seus dados foram salvos.");
    } catch (error) {
      Alert.alert(
        "Não foi possível salvar",
        error.message || "Tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  };


  const choosePhoto = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permissão necessária",
          "Permita o acesso à galeria para escolher uma foto de perfil.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const extension = asset.fileName?.split(".").pop()?.toLowerCase();

      const mimeType =
        asset.mimeType ||
        (extension === "png"
          ? "image/png"
          : extension === "webp"
            ? "image/webp"
            : "image/jpeg");

      const formData = new FormData();

      if (Platform.OS === "web") {
        // Na web, envia o arquivo real, não o objeto { uri, name, type }.
        let file = asset.file;

        if (!file) {
          const imageResponse = await fetch(asset.uri);
          file = await imageResponse.blob();
        }

        formData.append(
          "file",
          file,
          asset.fileName || `perfil-${Date.now()}.jpg`,
        );
      } else {
        // No Android/iOS, utiliza o formato do React Native.
        formData.append("file", {
          uri: asset.uri,
          name: asset.fileName || `perfil-${Date.now()}.jpg`,
          type: mimeType,
        });
      }

      setUploadingPhoto(true);

      const response = await api("/api/auth/profile/photo", token, {
        method: "POST",
        body: formData,
      });

      onUserUpdated?.(response.user);

      Alert.alert("Foto atualizada", "Sua foto de perfil foi salva.");
    } catch (error) {
      console.error("Erro ao enviar foto:", error);

      Alert.alert(
        "Erro ao enviar foto",
        error.message || "Não foi possível atualizar sua foto.",
      );
    } finally {
      setUploadingPhoto(false);
    }
  };


  return (
    <Screen>
      <View style={styles.pageIntro}>
        <Text style={styles.eyebrow}>SUA CONTA</Text>
        <Text style={styles.formTitle}>Meu perfil</Text>
        <Text style={styles.formIntro}>
          Gerencie seus dados pessoais e sua foto de perfil.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={{ alignItems: "center", paddingVertical: 20 }}>
          <Pressable
            onPress={choosePhoto}
            disabled={uploadingPhoto}
            accessibilityRole="button"
            accessibilityLabel="Alterar foto de perfil"
            style={{ alignItems: "center" }}
          >
            {photoUrl ? (
              <Image
                source={{ uri: assetUrl(photoUrl) }}
                style={{
                  width: 104,
                  height: 104,
                  borderRadius: 52,
                  borderWidth: 3,
                  borderColor: COLORS.sage,
                }}
              />
            ) : (
              <Avatar
                text={initials(displayName) || "?"}
                color={COLORS.terracotta}
              />
            )}

            <View
              style={{
                position: "absolute",
                right: 0,
                bottom: 0,
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: COLORS.teal,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 3,
                borderColor: COLORS.card,
              }}
            >
              <Icon name="camera" size={16} color={COLORS.white} />
            </View>
          </Pressable>

          {uploadingPhoto ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
              <ActivityIndicator color={COLORS.teal} />
              <Text style={styles.memberEmail}>Enviando foto...</Text>
            </View>
          ) : (
            <Text style={[styles.memberEmail, { marginTop: 10 }]}>
              Toque na foto para alterá-la
            </Text>
          )}

          <Text
            style={[
              styles.sectionTitleSmall,
              { textAlign: "center", marginTop: 14 },
            ]}
          >
            {displayName}
          </Text>

          <Text style={[styles.memberEmail, { textAlign: "center", marginTop: 5 }]}>
            {displayEmail}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 12,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 20,
              backgroundColor: COLORS.sage,
              gap: 6,
            }}
          >
            <Icon name="shield" size={15} color={COLORS.teal} />
            <Text style={{ color: COLORS.teal, fontSize: 12, fontWeight: "600" }}>
              Conta conectada
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.eyebrow}>INFORMAÇÕES PESSOAIS</Text>
        <Text style={[styles.sectionTitleSmall, { marginBottom: 16 }]}>
          Dados da conta
        </Text>

        <Text style={styles.memberEmail}>Nome completo</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          editable={editing && !saving}
          placeholder="Seu nome completo"
          placeholderTextColor={COLORS.muted}
          autoCapitalize="words"
          style={{
            borderWidth: 1,
            borderColor: COLORS.line,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            marginTop: 6,
            marginBottom: 16,
            color: COLORS.ink,
            backgroundColor: editing ? COLORS.white : COLORS.sage,
          }}
        />

        <Text style={styles.memberEmail}>E-mail de acesso</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          editable={editing && !saving}
          placeholder="seu@email.com"
          placeholderTextColor={COLORS.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            borderWidth: 1,
            borderColor: COLORS.line,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            marginTop: 6,
            marginBottom: 18,
            color: COLORS.ink,
            backgroundColor: editing ? COLORS.white : COLORS.sage,
          }}
        />

        {editing ? (
          <View style={{ gap: 10 }}>
            <Button
              icon="check"
              onPress={saveProfile}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>

            <Button
              variant="secondary"
              onPress={() => {
                setName(user?.name || user?.nome || "");
                setEmail(user?.email || "");
                setEditing(false);
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
          </View>
        ) : (
          <Button
            icon="edit-2"
            onPress={() => setEditing(true)}
          >
            Editar dados da conta
          </Button>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.eyebrow}>SEU ESPAÇO</Text>
        <Text style={[styles.sectionTitleSmall, { marginBottom: 12 }]}>
          {family?.name || "Minha família"}
        </Text>

        <Text style={styles.formIntro}>
          {family?.description ||
            "Um espaço para preservar as lembranças de quem importa."}
        </Text>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
          <View
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 14,
              backgroundColor: COLORS.sage,
            }}
          >
            <Icon name="book-open" size={19} color={COLORS.teal} />
            <Text style={{ fontSize: 23, fontWeight: "700", color: COLORS.ink, marginTop: 10 }}>
              {chapters.length}
            </Text>
            <Text style={styles.memberEmail}>Memórias</Text>
          </View>

          <View
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 14,
              backgroundColor: COLORS.peach,
            }}
          >
            <Icon name="users" size={19} color={COLORS.terracotta} />
            <Text style={{ fontSize: 23, fontWeight: "700", color: COLORS.ink, marginTop: 10 }}>
              {members.length}
            </Text>
            <Text style={styles.memberEmail}>Participantes</Text>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.card,
          { borderWidth: 1, borderColor: "#E8C8C1" },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Icon name="log-out" size={22} color={COLORS.danger} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.memberName, { color: COLORS.danger }]}>
              Sair da conta
            </Text>
            <Text style={styles.memberEmail}>
              Encerrar sua sessão neste dispositivo.
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 18 }}>
          <Button
            variant="danger"
            icon="log-out"
            onPress={confirmLogout}
          >
            Sair da conta
          </Button>
        </View>
      </View>

      <Text style={[styles.memberEmail, { textAlign: "center", marginBottom: 20 }]}>
        Memória Viva · Suas histórias, para sempre.
      </Text>
    </Screen>
  );
}

export default Profile;