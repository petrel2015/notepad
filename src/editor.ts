import { EditorState, Compartment, type Extension } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  highlightWhitespace,
  Decoration,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  bracketMatching,
  indentOnInput,
  syntaxHighlighting,
  HighlightStyle,
  foldGutter,
} from "@codemirror/language";
import { json } from "@codemirror/lang-json";
import { tags } from "@lezer/highlight";
export const appearance = new Compartment(),
  wrapping = new Compartment(),
  markers = new Compartment();
export const themeExtension = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "var(--editor-background)",
    color: "var(--editor-foreground)",
    fontSize: "13px",
  },
  ".cm-scroller": {
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
    lineHeight: "1.75",
    overflow: "auto",
  },
  ".cm-content": { padding: "14px 0" },
  ".cm-line": { padding: "0 20px" },
  ".cm-gutters": {
    background: "var(--editor-background)",
    color: "var(--editor-lineNumber)",
    border: "none",
    minWidth: "52px",
  },
  ".cm-activeLine,.cm-activeLineGutter": {
    background: "var(--editor-currentLine)",
  },
  "&.cm-focused .cm-cursor": { borderLeftColor: "var(--editor-cursor)" },
  "&.cm-focused .cm-selectionBackground,.cm-selectionBackground,::selection": {
    background: "var(--editor-selection) !important",
  },
  ".cm-highlightSpace,.cm-highlightTab,.eol-marker": {
    color: "var(--editor-whitespace)",
  },
  ".search-match": { background: "var(--editor-search)", borderRadius: "2px" },
  ".cm-changedLine": { background: "var(--diff-modifiedBackground)" },
  ".cm-deletedLine": { background: "var(--diff-deletedBackground)" },
  ".cm-insertedLine": { background: "var(--diff-addedBackground)" },
  ".cm-deletedText": {
    background: "var(--diff-deletedBackground)",
    textDecoration: "none",
  },
  ".cm-insertedText": { background: "var(--diff-addedBackground)" },
  ".cm-foldGutter": { width: "14px" },
});
class EOL extends WidgetType {
  constructor(readonly label: string) {
    super();
  }
  eq(other: EOL) {
    return this.label === other.label;
  }
  toDOM() {
    const el = document.createElement("span");
    el.className = "eol-marker";
    el.textContent = " " + this.label;
    el.setAttribute("aria-hidden", "true");
    return el;
  }
}
export function markerExtensions(enabled: boolean, label: string): Extension[] {
  return enabled
    ? [
        highlightWhitespace(),
        ViewPlugin.fromClass(
          class {
            decorations: DecorationSet;
            constructor(v: EditorView) {
              this.decorations = this.build(v);
            }
            update(u: any) {
              if (u.docChanged || u.viewportChanged)
                this.decorations = this.build(u.view);
            }
            build(v: EditorView) {
              const ranges = [];
              for (const { from, to } of v.visibleRanges) {
                for (let pos = from; pos <= to;) {
                  const line = v.state.doc.lineAt(pos);
                  if (line.to < v.state.doc.length)
                    ranges.push(
                      Decoration.widget({
                        widget: new EOL(label),
                        side: 1,
                      }).range(line.to),
                    );
                  pos = line.to + 1;
                }
              }
              return Decoration.set(ranges, true);
            }
          },
          { decorations: (v) => v.decorations },
        ),
      ]
    : [];
}
export function editorExtensions(
  onChange: (v: EditorView) => void,
  onFocus: (v: EditorView) => void,
  wrap: boolean,
  visible: boolean,
  label: string,
  readonly = false,
): Extension[] {
  return [
    lineNumbers(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    drawSelection(),
    history(),
    foldGutter(),
    bracketMatching(),
    indentOnInput(),
    json(),
    syntaxHighlighting(
      HighlightStyle.define([
        { tag: tags.string, color: "var(--syntax-string)" },
        { tag: tags.number, color: "var(--syntax-number)" },
        {
          tag: [tags.bool, tags.null, tags.keyword],
          color: "var(--syntax-keyword)",
        },
        { tag: tags.comment, color: "var(--syntax-comment)" },
      ]),
    ),
    keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
    themeExtension,
    EditorState.readOnly.of(readonly),
    wrapping.of(wrap ? EditorView.lineWrapping : []),
    markers.of(markerExtensions(visible, label)),
    EditorView.updateListener.of((u) => {
      if (u.docChanged || u.selectionSet) onChange(u.view);
    }),
    EditorView.domEventHandlers({
      focus: (_e, v) => {
        onFocus(v);
      },
    }),
  ];
}
