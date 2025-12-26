from gtts import gTTS
import io
import base64

def get_tts_audio(text, lang='en'):
    """
    Converts text to speech and returns a base64 encoded MP3 string.
    """
    try:
        
        tts = gTTS(text=text, lang=lang)
        
       
        mp3_fp = io.BytesIO()
        tts.write_to_fp(mp3_fp)
        
       
        mp3_fp.seek(0)
        
        
        audio_binary = mp3_fp.read()
        audio_base64 = base64.b64encode(audio_binary).decode('utf-8')
        
        return audio_base64
    except Exception as e:
        print(f"Error generating TTS: {e}")
        return None

# test block
if __name__ == "__main__":
    test_text = "Hello, this is a test of the Speak text to speech system."
    result = get_tts_audio(test_text)
    if result:
        print("✅ Success! Base64 audio generated.")
        print(f"Sample (first 50 chars): {result[:50]}...")