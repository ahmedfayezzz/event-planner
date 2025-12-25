"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link as LinkIcon,
  Undo,
  Redo,
  AlignRight,
  AlignCenter,
  AlignLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function MenuBar({ editor }: { editor: Editor | null }) {
  const [linkUrl, setLinkUrl] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);

  const setLink = useCallback(() => {
    if (!editor) return;

    if (linkUrl === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      // Make sure the URL has a protocol
      const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }

    setLinkUrl("");
    setLinkOpen(false);
  }, [editor, linkUrl]);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 border-b p-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive("bold") && "bg-muted"
        )}
      >
        <Bold className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive("italic") && "bg-muted"
        )}
      >
        <Italic className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        disabled={!editor.can().chain().focus().toggleUnderline().run()}
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive("underline") && "bg-muted"
        )}
      >
        <UnderlineIcon className="h-4 w-4" />
      </Button>

      <div className="mx-1 w-px bg-border" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive("bulletList") && "bg-muted"
        )}
      >
        <List className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive("orderedList") && "bg-muted"
        )}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <div className="mx-1 w-px bg-border" />

      {/* Text Alignment */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive({ textAlign: "right" }) && "bg-muted"
        )}
        title="محاذاة لليمين"
      >
        <AlignRight className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive({ textAlign: "center" }) && "bg-muted"
        )}
        title="توسيط"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive({ textAlign: "left" }) && "bg-muted"
        )}
        title="محاذاة لليسار"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>

      <div className="mx-1 w-px bg-border" />

      <Popover open={linkOpen} onOpenChange={setLinkOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("link") && "bg-muted"
            )}
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="start">
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setLink();
                }
              }}
              className="flex-1"
              dir="ltr"
            />
            <Button type="button" size="sm" onClick={setLink}>
              إضافة
            </Button>
          </div>
          {editor.isActive("link") && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 w-full text-destructive"
              onClick={() => {
                editor.chain().focus().unsetLink().run();
                setLinkOpen(false);
              }}
            >
              إزالة الرابط
            </Button>
          )}
        </PopoverContent>
      </Popover>

      <div className="mx-1 w-px bg-border" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        className="h-8 w-8 p-0"
      >
        <Undo className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        className="h-8 w-8 p-0"
      >
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "اكتب محتوى الرسالة هنا...",
  className,
  disabled = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
      Underline,
      TextAlign.configure({
        types: ["paragraph", "listItem"],
        defaultAlignment: "right", // Default to right alignment for Arabic RTL
      }),
    ],
    content,
    editable: !disabled,
    immediatelyRender: false, // Prevent SSR hydration mismatch
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none p-4 min-h-[200px] focus:outline-none [&_ul]:list-disc [&_ul]:mr-4 [&_ol]:list-decimal [&_ol]:mr-4 [&_li]:my-1",
        dir: "rtl",
      },
    },
  });

  // Update content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border bg-background",
        disabled && "opacity-50",
        className
      )}
    >
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
      {!content && (
        <style jsx global>{`
          .ProseMirror p.is-editor-empty:first-child::before {
            content: "${placeholder}";
            color: hsl(var(--muted-foreground));
            pointer-events: none;
            position: absolute;
          }
        `}</style>
      )}
    </div>
  );
}

// Placeholder buttons component for inserting dynamic fields
interface PlaceholderButtonsProps {
  onInsert: (placeholder: string) => void;
}

export function PlaceholderButtons({ onInsert }: PlaceholderButtonsProps) {
  const placeholders = [
    { label: "الاسم", value: "{{name}}" },
    { label: "البريد", value: "{{email}}" },
    { label: "الشركة", value: "{{companyName}}" },
    { label: "المنصب", value: "{{position}}" },
    { label: "الهاتف", value: "{{phone}}" },
  ];

  return (
    <div className="flex flex-wrap gap-1">
      <span className="text-sm text-muted-foreground ml-2">إدراج متغير:</span>
      {placeholders.map((p) => (
        <Button
          key={p.value}
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onInsert(p.value)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}

// Hook to get editor instance for placeholder insertion
export function useRichTextEditor() {
  const [editorContent, setEditorContent] = useState("");

  const insertAtCursor = useCallback((text: string) => {
    // This is a simple approach - in the actual component we'll handle cursor position
    setEditorContent((prev) => prev + text);
  }, []);

  return {
    content: editorContent,
    setContent: setEditorContent,
    insertAtCursor,
  };
}
