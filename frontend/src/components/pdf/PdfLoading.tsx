import { Loader2 } from "lucide-react";
import React from "react";

const PdfLoading = () => {
  return (
    <div className="w-full h-full flex flex-col gap-1 items-center justify-center">
      <h1>Loading document</h1>
      <Loader2 className="animate-spin" />
    </div>
  );
};

export default PdfLoading;
