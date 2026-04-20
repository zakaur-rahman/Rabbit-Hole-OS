/* eslint-disable @typescript-eslint/no-explicit-any */
import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance } from 'tippy.js';
import CommandList from './CommandList';

export default Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: { editor: any, range: any, props: any }) => {
          props.command({ editor, range });
        },
        render: () => {
          let component: ReactRenderer;
          let popup: Instance[];

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(CommandList, {
                props,
                editor: props.editor,
              });

              if (!props.clientRect) {
                return;
              }

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect as any,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              });
            },

            onUpdate(props: any) {
              component.updateProps(props);

              if (!props.clientRect) {
                return;
              }

              popup[0].setProps({
                getReferenceClientRect: props.clientRect as any,
              });
            },

            onKeyDown(props: any) {
              if (props.event.key === 'Escape') {
                popup[0].hide();
                return true;
              }

              return (component.ref as any)?.onKeyDown(props);
            },

            onExit() {
              popup[0].destroy();
              component.destroy();
            },
          };
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

export const getSuggestionItems = ({ query }: { query: string }) => {
  return [
    {
      title: 'Summarize',
      id: 'summarize',
      icon: 'Sparkles',
      description: 'Condense text into key points',
    },
    {
      title: 'Expand',
      id: 'expand',
      icon: 'FilePlus',
      description: 'Make text more detailed',
    },
    {
      title: 'Fix Grammar',
      id: 'fix_grammar',
      icon: 'CheckCheck',
      description: 'Improve spelling and grammar',
    },
    {
      title: 'Make Professional',
      id: 'professional',
      icon: 'Briefcase',
      description: 'Rewrite in a formal tone',
    },
  ].filter(item => item.title.toLowerCase().startsWith(query.toLowerCase()));
};
