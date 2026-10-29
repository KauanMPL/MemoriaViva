
import React, { useState } from "react";
import { Text, View } from "react-native";
import { api, COLORS } from "../services/api";
import styles from "../theme/styles";
import { Screen, Button, Field, Icon, Avatar } from "../components/ui";

// Gera as iniciais de um nome.
// Exemplo: "Kauan Pavaneli" -> "KP"
function initials(name) {
  if (!name || typeof name !== "string") {
    return "?";
  }

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function Members({ family, token, members = [], onRefresh }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const invite = async () => {
    if (!email.trim()) {
      setMessage("Digite o e-mail do familiar.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const result = await api(
        `/api/families/${family.id}/members/invite`,
        token,
        {
          method: "POST",
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        },
      );

      setMessage(result.message || "Convite registrado.");
      setEmail("");

      if (onRefresh) {
        await onRefresh();
      }
    } catch (e) {
      setMessage(e.message || "Não foi possível enviar o convite.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.pageIntro}>
        <Text style={styles.eyebrow}>
          AS PESSOAS POR TRÁS DAS LEMBRANÇAS
        </Text>

        <Text style={styles.formTitle}>
          Esta história é feita de muitas vozes.
        </Text>

        <Text style={styles.formIntro}>
          Convide quem você ama para registrar, comentar e cuidar das memórias
          da família.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>PARTICIPANTES</Text>
            <Text style={styles.sectionTitleSmall}>
              {members.length} pessoas
            </Text>
          </View>

          <Icon name="lock" size={17} color={COLORS.muted} />
        </View>

        {members.length === 0 ? (
          <Text style={styles.formIntro}>
            Nenhum participante encontrado.
          </Text>
        ) : (
          members.map((member) => {
            const user = member.user || {};
            const memberName = user.name || user.nome || "Familiar";
            const memberEmail = user.email || "";

            return (
              <View style={styles.memberRow} key={member.id}>
                <Avatar text={initials(memberName)} />

                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{memberName}</Text>
                  <Text style={styles.memberEmail}>{memberEmail}</Text>
                </View>

                <View style={styles.rolePill}>
                  <Text style={styles.roleText}>
                    {member.permission === "admin"
                      ? "admin"
                      : member.permission === "editor"
                        ? "edita"
                        : "vê"}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={[styles.card, { backgroundColor: COLORS.sage }]}>
        <Text style={styles.eyebrow}>CRESCER JUNTO</Text>

        <Text style={styles.inviteTitle}>
          Convide alguém da família.
        </Text>

        <Text style={styles.formIntro}>
          A pessoa poderá entrar com o mesmo e-mail e continuar esta história
          com vocês.
        </Text>

        <Field
          label="E-MAIL DO FAMILIAR"
          value={email}
          onChangeText={setEmail}
          placeholder="familiar@exemplo.com"
          keyboardType="email-address"
        />

        <Button onPress={invite} loading={loading} icon="arrow-right">
          Enviar convite
        </Button>

        {message ? (
          <Text style={styles.successText}>{message}</Text>
        ) : null}
      </View>
    </Screen>
  );
}

export function Settings({ family, token, onFamilyUpdated, onLogout }) {
  const [name, setName] = useState(family.name || "");
  const [description, setDescription] = useState(family.description || "");
  const [message, setMessage] = useState("");

  const save = async () => {
    if (!name.trim()) {
      setMessage("Digite o nome da família.");
      return;
    }

    try {
      setMessage("");

      const result = await api(`/api/families/${family.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      });

      if (onFamilyUpdated && result.family) {
        onFamilyUpdated(result.family);
      }

      setMessage("Alterações salvas.");
    } catch (e) {
      setMessage(e.message || "Não foi possível salvar as configurações.");
    }
  };

  return (
    <Screen>
      <View style={styles.pageIntro}>
        <Text style={styles.eyebrow}>CUIDAR DO ESPAÇO</Text>

        <Text style={styles.formTitle}>Configurações</Text>

        <Text style={styles.formIntro}>
          Deixe este espaço cada vez mais parecido com vocês.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.settingsIdentity}>
          <Avatar text={initials(name)} color={COLORS.terracotta} />

          <View>
            <Text style={styles.eyebrow}>IDENTIDADE</Text>
            <Text style={styles.sectionTitleSmall}>
              A família como ela é
            </Text>
          </View>
        </View>

        <Field
          label="NOME DA FAMÍLIA"
          value={name}
          onChangeText={setName}
          placeholder="Família Oliveira"
        />

        <Field
          label="UMA FRASE SOBRE VOCÊS"
          value={description}
          onChangeText={setDescription}
          placeholder="onde sempre cabe mais um"
          multiline
        />

        <View style={styles.privacyRow}>
          <View style={styles.privacyIcon}>
            <Icon name="lock" size={16} color={COLORS.teal} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.memberName}>Espaço privado</Text>
            <Text style={styles.memberEmail}>
              Apenas convidados veem as memórias.
            </Text>
          </View>

          <View style={styles.toggle}>
            <View style={styles.toggleDot} />
          </View>
        </View>

        <Button onPress={save} icon="check">
          Salvar configurações
        </Button>

        {message ? (
          <Text style={styles.successText}>{message}</Text>
        ) : null}
      </View>

      <Button variant="danger" onPress={onLogout} icon="log-out">
        Sair da conta
      </Button>
    </Screen>
  );
}
