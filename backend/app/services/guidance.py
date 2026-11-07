"""Transparent no-LLM fallback for the free, low-resource edition of Saarthi."""

def respond(transcript: str, language: str) -> str:
    text = transcript.lower()
    hindi = language.startswith("hi") or any(char in transcript for char in "अआइईउऊएऐओऔकखगघचछजटठडढतथदधनपफबभमयरलवशषसह")
    if any(word in text for word in ("otp", "password", "पिन", "पासवर्ड", "ओटीपी")):
        return "किसी को OTP, पासवर्ड या PIN मत बताइए। केवल आधिकारिक ऐप या हेल्पलाइन का इस्तेमाल करें।" if hindi else "Never share an OTP, password, or PIN. Use only an official app or helpline."
    if any(word in text for word in ("pension", "पेंशन", "document", "दस्तावेज", "documents")):
        return "पहले अपने राज्य या विभाग की आधिकारिक वेबसाइट पर सेवा खोजें। पहचान पत्र और आवेदन नंबर तैयार रखें, लेकिन उन्हें यहां साझा न करें। जरूरत हो तो नजदीकी सेवा केंद्र से मदद लें।" if hindi else "First find the service on the official state or department website. Keep your ID and application number ready, but do not share them here. A nearby service centre can help."
    if any(word in text for word in ("bank", "payment", "पैसा", "बैंक", "भुगतान")):
        return "पैसे या बैंक से जुड़ी मदद के लिए केवल बैंक के आधिकारिक नंबर या ऐप का उपयोग करें। किसी अनजान लिंक, स्क्रीन-शेयर ऐप, या कॉलर को जानकारी न दें।" if hindi else "For bank or payment help, use only your bank's official number or app. Do not share details through unknown links, screen-sharing apps, or callers."
    return "मैंने आपकी बात सुनी। कृपया अपना काम, शहर या संबंधित सरकारी विभाग बताइए। कोई OTP, पासवर्ड, बैंक जानकारी या पहचान संख्या साझा न करें।" if hindi else "I heard you. Please tell me the task, your city, or the relevant department. Do not share OTPs, passwords, bank details, or identity numbers."
