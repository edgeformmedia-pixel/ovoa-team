import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { HELLO, smsHref, useDevice } from "@/components/texting";
import { getPublicTextNumber } from "@/lib/account/texting.functions";

// Every "Text OVOA" button off the homepage. On an iPhone it opens Messages in
// one tap; anywhere else (and until the number has loaded) it goes to /text,
// which has the QR code and the email box for other phones.

// Asked once per page load, shared by every button on the page.
let asked: Promise<string | null> | null = null;

function useTextNumber() {
  const [number, setNumber] = useState<string | null>(null);
  useEffect(() => {
    let on = true;
    asked ??= getPublicTextNumber()
      .then((r) => r.number)
      .catch(() => null);
    void asked.then((n) => {
      if (!n) asked = null;
      if (on) setNumber(n);
    });
    return () => {
      on = false;
    };
  }, []);
  return number;
}

export function TextOvoaLink({
  className,
  children = "Text OVOA",
}: {
  className?: string;
  children?: ReactNode;
}) {
  const device = useDevice();
  const number = useTextNumber();
  if (number && device === "iphone") {
    return (
      <a href={smsHref(number, HELLO, device)} data-track="Text OVOA" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link to="/text" className={className}>
      {children}
    </Link>
  );
}
