import React, { useState } from "react";
import { Text, View, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, COLORS } from "../services/api";
import styles from "../theme/styles";
import { Screen, Logo, Button, Field, Avatar, TopBar, Icon } from "../components/ui";

export function Welcome({ onLogin, onRegister }) {
  return (
    <Screen>
      <View style={styles.welcome}>
        <Logo />
        <View style={styles.welcomeOrb}>
          <View style={styles.orbCircle}>
            <Icon name="heart" size={30} color={COLORS.terracotta} />
          </View>
          <Text style={styles.orbYear}>desde 1958</Text>
        </View>
        <Text style={styles.eyebrow}>HISTÓRIAS QUE FICAM</Text>
        <Text style={styles.heroTitle}>
          O tempo passa.{`\n`}
          <Text style={styles.heroItalic}>A memória permanece.</Text>
        </Text>
        <Text style={styles.heroText}>
          Um espaço bonito e seguro para guardar as histórias da sua família,
          conectar gerações e transformar arquivos soltos em lembranças vivas.
        </Text>
        <Button onPress={onRegister} icon="arrow-right">
          Começar minha história
        </Button>
        <Button onPress={onLogin} variant="quiet">
          Já tenho uma conta
        </Button>
        <View style={styles.trust}>
          <View style={styles.avatarStack}>
            <Avatar text="AM" />
            <Avatar text="JP" color="#c47d69" />
            <Avatar text="LS" color="#aa9279" />
            <Avatar text="+" color={COLORS.teal} />
          </View>
          <Text style={styles.trustText}>
            Feito para famílias que{`\n`}querem lembrar juntas.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

export function Auth({ mode, onBack, onSuccess }) {
  const isRegister = mode === "register";
  const isForgot = mode === "forgot";
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    try {
      setLoading(true);
      setError("");
      const endpoint = isForgot
        ? "/api/auth/forgot-password"
        : isRegister
          ? "/api/auth/register"
          : "/api/auth/login";
      const result = await api(endpoint, null, {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (isForgot) {
        setError(
          result.message ||
          "Se o e-mail estiver cadastrado, enviaremos as instruções.",
        );
        return;
      }
      await AsyncStorage.setItem("mv_token", result.token);
      onSuccess(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Screen>
      <TopBar onBack={onBack} />
      <View style={styles.authBlock}>
        <Text style={styles.eyebrow}>
          {isRegister
            ? "COMECE AGORA"
            : isForgot
              ? "RECUPERAÇÃO"
              : "QUE BOM TER VOCÊ AQUI"}
        </Text>
        <Text style={styles.authTitle}>
          {isRegister
            ? "Crie o espaço da sua família."
            : isForgot
              ? "Recupere seu acesso."
              : "Continue a sua história."}
        </Text>
        <Text style={styles.authLead}>
          {isRegister
            ? "Seus momentos merecem um lugar para durar."
            : isForgot
              ? "Enviaremos instruções para o seu e-mail."
              : "Entre para continuar de onde parou."}
        </Text>
        {isRegister && (
          <Field
            label="SEU NOME"
            value={form.name}
            onChangeText={(name) => setForm({ ...form, name })}
            placeholder="Como a família chama você?"
          />
        )}
        {
          <Field
            label="SEU E-MAIL"
            value={form.email}
            onChangeText={(email) => setForm({ ...form, email })}
            placeholder="voce@exemplo.com"
            keyboardType="email-address"
          />
        }
        {!isForgot && (
          <Field
            label="SUA SENHA"
            value={form.password}
            onChangeText={(password) => setForm({ ...form, password })}
            placeholder="Mínimo de 6 caracteres"
            secureTextEntry
          />
        )}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        <Button onPress={submit} loading={loading} icon="arrow-right">
          {isRegister
            ? "Criar minha conta"
            : isForgot
              ? "Enviar instruções"
              : "Entrar"}
        </Button>
        {!isRegister && !isForgot && (
          <Pressable onPress={() => onBack("forgot")}>
            <Text style={styles.linkCenter}>Esqueci minha senha</Text>
          </Pressable>
        )}
        <Text style={styles.switchText}>
          {isForgot
            ? "Lembrou?"
            : isRegister
              ? "Já tem uma conta?"
              : "Ainda não tem uma conta?"}{" "}
          <Text
            onPress={() => onBack(isRegister ? "login" : "register")}
            style={styles.link}
          >
            {isForgot
              ? "Voltar para o login"
              : isRegister
                ? "Entrar"
                : "Criar agora"}
          </Text>
        </Text>
      </View>
    </Screen>
  );
}

export function FamilySetup({ token, user, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const create = async () => {
    try {
      setLoading(true);
      const result = await api("/api/families", token, {
        method: "POST",
        body: JSON.stringify({ name, description }),
      });
      onCreated(result.family);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Screen>
      <View style={styles.setup}>
        <Logo />
        <Text style={styles.eyebrow}>PRIMEIRO PASSO</Text>
        <Text style={styles.setupTitle}>
          Vamos dar um nome{`\n`}
          <Text style={styles.heroItalic}>a esta história?</Text>
        </Text>
        <Text style={styles.heroText}>
          Crie o espaço onde as memórias da sua família vão morar. Você poderá
          convidar outras pessoas depois.
        </Text>
        <Field
          label="NOME DA FAMÍLIA"
          value={name}
          onChangeText={setName}
          placeholder="Ex.: Família Oliveira"
        />
        <Field
          label="UMA FRASE SOBRE VOCÊS"
          value={description}
          onChangeText={setDescription}
          placeholder="Ex.: onde sempre cabe mais um"
          multiline
        />
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        <Button onPress={create} loading={loading} icon="arrow-right">
          Criar espaço da família
        </Button>
        <Text style={styles.setupNote}>
          Olá, {user.name.split(" ")[0]}. Você será o administrador.
        </Text>
      </View>
    </Screen>
  );
}
