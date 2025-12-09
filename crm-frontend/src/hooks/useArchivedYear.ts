import { useState, useEffect } from "react";

export function useArchivedYear() {
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [academicYearId, setAcademicYearId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const update = () => {
      const readOnly = localStorage.getItem("isReadOnly") === "true";
      const yearId = readOnly
        ? localStorage.getItem("archivedYearId") || ""
        : localStorage.getItem("academicYearId") || "";
      setIsReadOnly(readOnly);
      setAcademicYearId(yearId);
      setIsLoading(false);
    };
    
    update();
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "isReadOnly" || e.key === "academicYearId" || e.key === "archivedYearId") {
        update();
      }
    };
    
    window.addEventListener("storage", handleStorageChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const hasActiveYear = !isReadOnly && !!academicYearId;

  return { isReadOnly, academicYearId, isLoading, hasActiveYear };
}
