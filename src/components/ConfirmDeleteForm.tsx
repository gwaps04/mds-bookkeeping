// src/components/ConfirmDeleteForm.tsx
"use client";

import SubmitButton from "@/components/SubmitButton";

interface ConfirmDeleteFormProps {
  action: (formData: FormData) => Promise<void> | void;
  id: string;
  itemName?: string;
}

export default function ConfirmDeleteForm({ 
  action, 
  id, 
  itemName = "this item" 
}: ConfirmDeleteFormProps) {
  
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`🚨 Are you absolutely sure you want to delete ${itemName}? This action cannot be undone.`)) {
          e.preventDefault(); 
        }
      }}
    >
      {/* It securely passes the ID to your Server Action */}
      <input type="hidden" name="id" value={id} />
      
      {/* It uses your global SubmitButton to show the spinner! */}
      <SubmitButton 
        title="Delete" 
        loadingTitle="Deleting..." 
        variant="destructive" 
        size="sm" 
        className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
      />
    </form>
  );
}