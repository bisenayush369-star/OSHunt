"use client";

import * as React from "react";
import { TOPIC_EVENT, type TopicValue } from "@/app/contact/lib/contact";

type TopicLinkProps = {
  topic: TopicValue;
  href?: string;
  children: React.ReactNode;
  className?: string;
};

export function TopicLink({ topic, href = "#contact-form", children, className }: TopicLinkProps) {
  const onClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const custom = new CustomEvent(TOPIC_EVENT, {
      detail: topic,
      bubbles: true,
      cancelable: true,
    });

    window.dispatchEvent(custom);
    if (custom.defaultPrevented) {
      event.preventDefault();
    }
  };

  return (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  );
}
