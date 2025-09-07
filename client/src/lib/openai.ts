// Note: This will be used on the server side via API calls
export const transcribeAudio = async (audioFile: File): Promise<{ text: string }> => {
  const formData = new FormData();
  formData.append('audio', audioFile);
  
  const response = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error('Failed to transcribe audio');
  }
  
  return response.json();
};
