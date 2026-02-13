import { useEffect } from "react";

const BASE_TITLE = "PoB Flashcards";

export function useDocumentTitle(title) {
  useEffect(() => {
    const previous_title = document.title;
    document.title = title ? `${title} | ${BASE_TITLE}` : BASE_TITLE;
    
    return () => {
      document.title = previous_title;
    };
  }, [title]);
}
