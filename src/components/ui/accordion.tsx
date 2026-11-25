"use client";

import { Accordion as Primitive } from "radix-ui";
import { Plus } from "lucide-react";

export function Faq({ items }: { items: string[][] }) {
  return (
    <Primitive.Root type="single" collapsible className="border-t border-hairline">
      {items.map(([question, answer]) => (
        <Primitive.Item key={question} value={question} className="border-b border-hairline">
          <Primitive.Header>
            <Primitive.Trigger className="group flex min-h-16 w-full cursor-pointer items-center justify-between gap-5 py-4 text-left text-lg leading-snug font-semibold">
              {question}
              <Plus aria-hidden className="size-5 shrink-0 text-brand-ink transition-transform duration-200 group-data-[state=open]:rotate-45 motion-reduce:transition-none" />
            </Primitive.Trigger>
          </Primitive.Header>
          <Primitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down motion-reduce:animate-none">
            <p className="max-w-2xl pb-6 text-muted-ink">{answer}</p>
          </Primitive.Content>
        </Primitive.Item>
      ))}
    </Primitive.Root>
  );
}
