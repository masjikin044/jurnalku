import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { isUuid } from "@/lib/utils";
import JournalEditor from "@/components/editor/JournalEditor";

export const metadata: Metadata = { title: "Editor", robots: { index: false } };

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const user = await requireUser();
  const journal = await prisma.journal.findFirst({ where: { id, userId: user.id } });
  if (!journal) notFound();

  return (
    <JournalEditor
      journal={{
        id: journal.id,
        userId: user.id,
        title: journal.title,
        content: journal.content as JSONContent,
        mood: journal.mood,
        category: journal.category,
        tags: journal.tags,
        meta: {
          status: journal.status,
          visibility: journal.visibility,
          slug: journal.slug,
          hasPassword: !!journal.passwordHash,
        },
      }}
    />
  );
}
