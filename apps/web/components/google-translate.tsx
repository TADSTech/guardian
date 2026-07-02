"use client";

import { useEffect } from "react";

export function GoogleTranslate() {
  useEffect(() => {
    // Only initialize if not already initialized
    if (typeof window !== "undefined" && !(window as any).googleTranslateElementInit) {
      (window as any).googleTranslateElementInit = () => {
        if ((window as any).google && (window as any).google.translate) {
          new (window as any).google.translate.TranslateElement(
            { 
              pageLanguage: "en",
              includedLanguages: "en,ha,yo,ig,pcm", // Include English, Hausa, Yoruba, Igbo, Nigerian Pidgin
              layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE 
            },
            "google_translate_element"
          );
        }
      };

      const script = document.createElement("script");
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return <div id="google_translate_element" className="min-w-[150px]"></div>;
}
