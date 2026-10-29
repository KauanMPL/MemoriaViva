
import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { api, COLORS, assetUrl, formatDate } from "../services/api";
import styles from "../theme/styles";
import {
  Screen,
  TopBar,
  EmptyState,
  Button,
  Field,
  Icon,
  Filter,
  Stat,
  Avatar,
} from "../components/ui";

function initials(name) {
  if (!name || typeof name !== "string") return "?";

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return (
    parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

function getErrorMessage(error) {
  if (error?.message) return error.message;
  return "Ocorreu um erro inesperado. Tente novamente.";
}

export function Dashboard({
  family,
  chapters,
  members,
  setScreen,
  openChapter,
  onAdd,
}) {
  const years = useMemo(
    () =>
      new Set(
        chapters
          .map((item) => item.eventDate?.slice(0, 4))
          .filter(Boolean),
      ).size,
    [chapters],
  );

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollBottom}
    >
      <View style={styles.welcomeCard}>
        <Text style={styles.eyebrow}>UM RETRATO DA SUA HISTÓRIA</Text>

        <Text style={styles.welcomeTitle}>
          {family?.description ||
            "Cada família tem um jeito único de contar o tempo."}
        </Text>

        <Text style={styles.welcomeSub}>
          Comece registrando aquele momento que sempre volta nas conversas.
        </Text>
      </View>

      <View style={styles.stats}>
        <Stat
          value={String(chapters.length).padStart(2, "0")}
          label="memórias"
        />
        <Stat
          value={String(members.length).padStart(2, "0")}
          label="pessoas"
        />
        <Stat value={String(years).padStart(2, "0")} label="anos" />
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.eyebrow}>O QUE ESTÁ VIVO POR AQUI</Text>
          <Text style={styles.sectionTitle}>Memórias recentes</Text>
        </View>

        <Pressable onPress={() => setScreen("timeline")}>
          <Text style={styles.link}>Ver todas</Text>
        </Pressable>
      </View>

      {chapters.length === 0 ? (
        <EmptyState onCreate={onAdd} />
      ) : (
        chapters.slice(0, 3).map((chapter) => (
          <ChapterCard
            key={chapter.id}
            chapter={chapter}
            onPress={() => openChapter(chapter)}
          />
        ))
      )}

      <View style={styles.quote}>
        <Text style={styles.quoteMark}>“</Text>
        <Text style={styles.quoteText}>
          Uma família é um conjunto de pessoas que carregam umas às outras no
          tempo.
        </Text>
        <Text style={styles.quoteAuthor}>— Memória Viva</Text>
      </View>
    </ScrollView>
  );
}

export function ChapterCard({ chapter, onPress }) {
  const media = chapter.media?.[0];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chapterCard,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.chapterImage,
          media?.type === "image" && { backgroundColor: "#ccdcd2" },
        ]}
      >
        {media?.type === "image" ? (
          <Image
            source={{ uri: assetUrl(media.url) }}
            style={styles.chapterImageFill}
          />
        ) : (
          <Icon name="star" size={24} color="#ffffffaa" />
        )}

        <View style={styles.chapterImageOverlay}>
          <Text style={styles.chapterYear}>
            {chapter.eventDate?.slice(0, 4) || ""}
          </Text>

          <View style={styles.chapterPrivacy}>
            <Icon
              name={chapter.visibility === "private" ? "lock" : "users"}
              size={11}
              color={COLORS.white}
            />
            <Text style={styles.chapterPrivacy}>
              {chapter.visibility === "private" ? "privado" : "família"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.chapterBody}>
        <Text style={styles.chapterDate}>
          {formatDate(chapter.eventDate)}
        </Text>

        <Text style={styles.chapterTitle}>{chapter.title}</Text>

        <Text style={styles.chapterDescription} numberOfLines={2}>
          {chapter.description ||
            "Uma memória esperando por mais detalhes."}
        </Text>

        <View style={styles.chapterFooter}>
          <Text style={styles.mutedSmall}>
            {chapter.media?.length || 0} registros
          </Text>

          <View style={styles.circleArrow}>
            <Icon name="arrow-right" size={13} color={COLORS.teal} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export function Timeline({
  chapters,
  members,
  setScreen,
  openChapter,
  onAdd,
}) {
  const [memberId, setMemberId] = useState("");

  const filtered = memberId
    ? chapters.filter((item) => item.memberIds?.includes(memberId))
    : chapters;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollBottom}
    >
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.eyebrow}>UMA HISTÓRIA EM MOVIMENTO</Text>
          <Text style={styles.sectionTitle}>Linha do tempo</Text>
        </View>

        <Pressable onPress={onAdd}>
          <Icon name="plus-circle" size={23} color={COLORS.teal} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        <Filter
          active={!memberId}
          label="Toda a família"
          onPress={() => setMemberId("")}
        />

        {members.map((item) => (
          <Filter
            key={item.userId}
            active={memberId === item.userId}
            label={item.user?.name?.split(" ")[0] || "Pessoa"}
            onPress={() => setMemberId(item.userId)}
          />
        ))}
      </ScrollView>

      {filtered.length === 0 ? (
        <EmptyState onCreate={onAdd} />
      ) : (
        <View style={styles.timeline}>
          {filtered.map((chapter, index) => (
            <View key={chapter.id} style={styles.timelineItem}>
              <View style={styles.timelineRail}>
                <View style={styles.timelineDot} />
                <Text style={styles.timelineYear}>
                  {chapter.eventDate?.slice(0, 4) || ""}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <ChapterCard
                  chapter={chapter}
                  onPress={() => openChapter(chapter)}
                />

                <Text style={styles.timelineNumber}>
                  {String(index + 1).padStart(2, "0")}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

export function ChapterForm({
  family,
  token,
  members,
  existing,
  onSaved,
  onBack,
}) {
  const [form, setForm] = useState({
    title: existing?.title || "",
    eventDate:
      existing?.eventDate?.slice(0, 10) ||
      new Date().toISOString().slice(0, 10),
    description: existing?.description || "",
    visibility: existing?.visibility || "family",
    memberIds: existing?.memberIds || [],
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const toggle = (id) => {
    setForm((previous) => ({
      ...previous,
      memberIds: previous.memberIds.includes(id)
        ? previous.memberIds.filter((item) => item !== id)
        : [...previous.memberIds, id],
    }));
  };

  const save = async () => {
    if (!form.title.trim()) {
      setError("Informe um título para a memória.");
      return;
    }

    if (!form.eventDate.trim()) {
      setError("Informe a data da memória.");
      return;
    }

    try {
      setError("");
      setLoading(true);

      const result = await api(
        existing
          ? `/api/chapters/${existing.id}`
          : `/api/families/${family.id}/chapters`,
        token,
        {
          method: existing ? "PATCH" : "POST",
          body: JSON.stringify(form),
        },
      );

      if (!result?.chapter) {
        throw new Error("O servidor não retornou a memória salva.");
      }

      onSaved(result.chapter);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <TopBar
        title={existing ? "Editar memória" : "Nova memória"}
        onBack={onBack}
      />

      <View style={styles.formPage}>
        <Text style={styles.eyebrow}>
          {existing ? "EDITAR CAPÍTULO" : "NOVO CAPÍTULO"}
        </Text>

        <Text style={styles.formTitle}>
          {existing
            ? "Dê novos detalhes a esta memória."
            : "Qual momento merece ser lembrado?"}
        </Text>

        <Text style={styles.formIntro}>
          Conte um pouco. O tempo agradece quando a gente dá nome às coisas
          importantes.
        </Text>

        <Field
          label="TÍTULO DA MEMÓRIA"
          value={form.title}
          onChangeText={(title) => setForm({ ...form, title })}
          placeholder="Ex.: O dia em que nos mudamos"
        />

        <Field
          label="QUANDO ACONTECEU"
          value={form.eventDate}
          onChangeText={(eventDate) => setForm({ ...form, eventDate })}
          placeholder="AAAA-MM-DD"
        />

        <Field
          label="CONTE A HISTÓRIA"
          value={form.description}
          onChangeText={(description) =>
            setForm({ ...form, description })
          }
          placeholder="O que você gostaria que as próximas gerações soubessem?"
          multiline
        />

        <Text style={styles.fieldLabel}>QUEM PODE VER?</Text>

        <View style={styles.segment}>
          <Pressable
            onPress={() => setForm({ ...form, visibility: "family" })}
            style={[
              styles.segmentItem,
              form.visibility === "family" && styles.segmentActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                form.visibility === "family" &&
                  styles.segmentTextActive,
              ]}
            >
              Toda a família
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setForm({ ...form, visibility: "private" })}
            style={[
              styles.segmentItem,
              form.visibility === "private" && styles.segmentActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                form.visibility === "private" &&
                  styles.segmentTextActive,
              ]}
            >
              Participantes
            </Text>
          </Pressable>
        </View>

        <Text style={styles.fieldLabel}>QUEM FAZ PARTE?</Text>

        <View style={styles.memberPills}>
          {members.map((member) => (
            <Pressable
              key={member.userId}
              onPress={() => toggle(member.userId)}
              style={[
                styles.memberPill,
                form.memberIds.includes(member.userId) &&
                  styles.memberPillActive,
              ]}
            >
              <Avatar
                text={initials(member.user?.name)}
                small
                color={
                  form.memberIds.includes(member.userId)
                    ? COLORS.teal
                    : "#c8927c"
                }
              />

              <Text style={styles.memberPillText}>
                {member.user?.name?.split(" ")[0] || "Pessoa"}
              </Text>

              {form.memberIds.includes(member.userId) ? (
                <Icon name="check" size={14} color={COLORS.teal} />
              ) : null}
            </Pressable>
          ))}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Button onPress={save} loading={loading} icon="arrow-right">
          {existing ? "Salvar alterações" : "Guardar esta memória"}
        </Button>
      </View>
    </Screen>
  );
}

export function ChapterDetail({
  chapter,
  token,
  onBack,
  onRefresh,
  onEdit,
  onDelete,
}) {
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const addComment = async () => {
    if (!comment.trim()) return;

    try {
      setError("");

      await api(`/api/chapters/${chapter.id}/comments`, token, {
        method: "POST",
        body: JSON.stringify({ body: comment.trim() }),
      });

      setComment("");
      await onRefresh();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const upload = async () => {
    if (uploading) return;

    try {
      setError("");

      const picked = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "video/*", "audio/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (picked.canceled || !picked.assets?.[0]) return;

      const item = picked.assets[0];

      if (!item.uri && !item.file) {
        throw new Error("Não foi possível acessar o arquivo selecionado.");
      }

      const filename = item.name || `memoria-${Date.now()}`;
      const mimeType =
        item.mimeType || "application/octet-stream";

      setUploading(true);

      const formData = new FormData();

      if (Platform.OS === "web") {
        // No navegador, envie o File original retornado pelo DocumentPicker.
        let browserFile = item.file;

        if (!browserFile && item.uri) {
          const response = await fetch(item.uri);

          if (!response.ok) {
            throw new Error("Não foi possível ler o arquivo selecionado.");
          }

          const blob = await response.blob();

          browserFile = new File([blob], filename, {
            type: mimeType,
          });
        }

        if (!browserFile) {
          throw new Error("O navegador não disponibilizou o arquivo.");
        }

        formData.append("file", browserFile, filename);
      } else {
        // No Android/iOS, o React Native utiliza uri, name e type.
        formData.append(
          "file",
          {
            uri: item.uri,
            name: filename,
            type: mimeType,
          },
        );
      }

      const result = await api(
        `/api/chapters/${chapter.id}/media`,
        token,
        {
          method: "POST",
          body: formData,
        },
      );

      if (result?.error) {
        throw new Error(result.error);
      }

      await onRefresh();

      if (Platform.OS === "web") {
        window.alert("Arquivo enviado com sucesso!");
      } else {
        Alert.alert("Sucesso", "Arquivo enviado com sucesso!");
      }
    } catch (e) {
      const message = getErrorMessage(e);
      setError(message);

      if (Platform.OS === "web") {
        window.alert(`Não foi possível enviar o arquivo: ${message}`);
      } else {
        Alert.alert("Falha no upload", message);
      }
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = () => {
    const remove = () => onDelete();

    if (Platform.OS === "web") {
      if (
        window.confirm(
          "Excluir memória? Esta ação remove o capítulo, mídias e comentários.",
        )
      ) {
        remove();
      }
      return;
    }

    Alert.alert(
      "Excluir memória",
      "Esta ação remove o capítulo, mídias e comentários.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: remove },
      ],
    );
  };

  return (
    <Screen>
      <TopBar
        title="Memória"
        onBack={onBack}
        action={
          <Pressable onPress={onEdit}>
            <Icon name="edit-3" size={19} color={COLORS.teal} />
          </Pressable>
        }
      />

      <View style={styles.detailPage}>
        <Text style={styles.chapterDate}>
          {formatDate(chapter.eventDate)}{" "}
          {"·"}{" "}
          {chapter.visibility === "private"
            ? "privado"
            : "compartilhado"}
        </Text>

        <Text style={styles.detailTitle}>{chapter.title}</Text>

        <Text style={styles.detailDescription}>
          {chapter.description ||
            "Uma história que ainda pode ganhar mais detalhes."}
        </Text>

        <View style={styles.detailActions}>
          <Button
            variant="outline"
            small
            onPress={onEdit}
            icon="edit-3"
          >
            Editar
          </Button>

          <Button
            variant="danger"
            small
            onPress={confirmDelete}
            icon="trash-2"
          >
            Excluir
          </Button>
        </View>

        <View style={styles.detailSectionHeader}>
          <View>
            <Text style={styles.eyebrow}>REGISTROS</Text>
            <Text style={styles.sectionTitleSmall}>
              Fotos, vídeos e áudios
            </Text>
          </View>

          <Button
            small
            onPress={upload}
            loading={uploading}
            icon="upload-cloud"
          >
            Adicionar
          </Button>
        </View>

        {chapter.media?.length ? (
          <View style={styles.mediaGrid}>
            {chapter.media.map((media) => (
              <View style={styles.mediaItem} key={media.id}>
                {media.type === "image" ? (
                  <Image
                    source={{ uri: assetUrl(media.url) }}
                    style={styles.mediaImage}
                  />
                ) : (
                  <View
                    style={[
                      styles.mediaNonImage,
                      media.type === "video" && {
                        backgroundColor: COLORS.peach,
                      },
                    ]}
                  >
                    <Icon
                      name={media.type === "audio" ? "volume-2" : "film"}
                      size={25}
                      color={COLORS.teal}
                    />
                    <Text style={styles.mutedSmall}>{media.type}</Text>
                  </View>
                )}

                <Text style={styles.mediaTitle} numberOfLines={1}>
                  {media.title || "Arquivo"}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.mediaEmpty}>
            <Icon name="upload-cloud" size={25} color="#8daf9f" />

            <Text style={styles.mutedText}>
              Este capítulo ainda não tem registros.
            </Text>

            <Button
              variant="quiet"
              onPress={upload}
              loading={uploading}
              icon="arrow-right"
            >
              Adicionar o primeiro
            </Button>
          </View>
        )}

        <View style={styles.commentsBox}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Icon
              name="message-circle"
              size={12}
              color={COLORS.terracotta}
            />
            <Text style={styles.eyebrow}>CONVERSA DA FAMÍLIA</Text>
          </View>

          <Text style={styles.sectionTitleSmall}>
            O que você lembra?
          </Text>

          {chapter.comments?.length ? (
            chapter.comments.map((item) => (
              <View style={styles.comment} key={item.id}>
                <Avatar
                  text={initials(item.user?.name)}
                  small
                />

                <View style={{ flex: 1 }}>
                  <Text style={styles.commentAuthor}>
                    {item.user?.name || "Membro da família"}
                  </Text>

                  <Text style={styles.commentDate}>
                    {formatDate(item.createdAt)}
                  </Text>

                  <Text style={styles.commentBody}>{item.body}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.mutedText}>
              Seja a primeira pessoa a deixar um detalhe desta história.
            </Text>
          )}

          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Escreva uma lembrança…"
            placeholderTextColor="#a1aca6"
            multiline
            style={[styles.input, styles.commentInput]}
          />

          <Button onPress={addComment} icon="send">
            Adicionar comentário
          </Button>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}
