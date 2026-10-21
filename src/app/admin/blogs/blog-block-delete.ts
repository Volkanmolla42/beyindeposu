import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const BLOCK_DELETE_LABELS: Record<string, string> = {
  table: "Tabloyu sil",
  callout: "Bloğu sil",
};

export const BlogBlockDelete = Extension.create({
  name: "blogBlockDelete",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("blogBlockDelete"),
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];

            state.doc.descendants((node, pos) => {
              const label = BLOCK_DELETE_LABELS[node.type.name];
              if (!label) return;

              decorations.push(
                Decoration.widget(
                  pos,
                  (view, getPos) => {
                    const control = document.createElement("div");
                    control.contentEditable = "false";
                    control.className = "blog-block-delete";

                    const button = document.createElement("button");
                    button.type = "button";
                    button.className = "blog-block-delete-button";
                    button.textContent = label;
                    button.title = label;
                    button.setAttribute("aria-label", label);

                    button.addEventListener("mousedown", (event) => {
                      event.preventDefault();
                    });
                    button.addEventListener("click", () => {
                      const blockPos = getPos();
                      if (blockPos == null) return;

                      const block = view.state.doc.nodeAt(blockPos);
                      if (!block) return;

                      view.dispatch(
                        view.state.tr.delete(
                          blockPos,
                          blockPos + block.nodeSize,
                        ),
                      );
                    });

                    control.appendChild(button);
                    return control;
                  },
                  { side: -1 },
                ),
              );
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
