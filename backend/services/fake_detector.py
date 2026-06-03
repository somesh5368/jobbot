"""
Fake Job Detection Service
Scores each job listing 0-100 for fraud risk
"""
import re
from typing import Tuple


# Red flag keywords that indicate fake jobs
FAKE_KEYWORDS = [
    "pay registration fee", "registration fee", "security deposit",
    "training fee", "processing fee", "pay to join", "investment required",
    "earn from home unlimited", "no experience unlimited salary",
    "work from home daily payment", "mlm", "network marketing pyramid",
    "1000 per day guaranteed", "2000 per day guaranteed",
    "click ads earn money", "data entry work from home daily payment",
    "typing work", "copy paste work", "form filling work",
    "whatsapp reselling", "dropshipping guaranteed income",
]

# Suspicious domain patterns
SUSPICIOUS_DOMAINS = [
    ".tk", ".ml", ".ga", ".cf", ".gq",  # Free TLDs often used for scams
    "wixsite", "weebly", "blogspot",  # Free website builders for fake companies
    "bit.ly", "tinyurl", "shorturl",  # URL shorteners hiding real destination
]

# Legitimate company indicators
LEGIT_INDICATORS = [
    "pvt ltd", "private limited", "ltd", "llp", "inc", "corp",
    "technologies", "solutions", "systems", "services",
    "iit", "nit", "iiit", "iim",  # Premier institutions
    "infosys", "tcs", "wipro", "hcl", "cognizant",  # Known companies
    "google", "microsoft", "amazon", "flipkart", "swiggy", "zomato",
]


def calculate_fake_risk(
    title: str,
    company: str,
    description: str,
    stipend: str,
    apply_url: str,
    source: str,
) -> Tuple[int, list[str]]:
    """
    Returns (risk_score 0-100, list_of_reasons)
    0-30 = Safe (green)
    31-60 = Suspicious (yellow)
    61-100 = Likely Fake (red)
    """
    score = 0
    reasons = []

    text = f"{title} {company} {description}".lower()
    url = (apply_url or "").lower()

    # --- CHECK 1: Payment demands (highest weight) ---
    for keyword in FAKE_KEYWORDS:
        if keyword in text:
            score += 35
            reasons.append(f"⚠️ Suspicious phrase: '{keyword}'")
            break

    # --- CHECK 2: Unrealistic salary/stipend ---
    if stipend:
        stipend_lower = stipend.lower()
        # Extract numbers
        numbers = re.findall(r'\d+', stipend.replace(",", ""))
        if numbers:
            max_num = max(int(n) for n in numbers)
            if max_num > 200000:  # > 2 lakh/month for internship = suspicious
                score += 20
                reasons.append("⚠️ Unrealistically high salary/stipend")

    # --- CHECK 3: Suspicious domain ---
    for domain in SUSPICIOUS_DOMAINS:
        if domain in url:
            score += 25
            reasons.append(f"⚠️ Suspicious URL domain: {domain}")
            break

    # --- CHECK 4: No company website / URL ---
    if not apply_url or len(apply_url) < 10:
        score += 15
        reasons.append("⚠️ No application URL provided")

    # --- CHECK 5: Very short description ---
    if len(description or "") < 100:
        score += 10
        reasons.append("⚠️ Very short job description")

    # --- CHECK 6: Too-good-to-be-true patterns ---
    too_good = ["guaranteed", "no experience required unlimited", "immediate joining bonus",
                "earn lakhs", "crore", "passive income guaranteed"]
    for phrase in too_good:
        if phrase in text:
            score += 15
            reasons.append(f"⚠️ Too-good-to-be-true claim: '{phrase}'")
            break

    # --- CHECK 7: No company name or generic ---
    if not company or len(company) < 3 or company.lower() in ["company", "firm", "organization", "startup"]:
        score += 10
        reasons.append("⚠️ Missing or generic company name")

    # --- CHECK 8: Legitimate source bonus (reduce score) ---
    trusted_sources = ["internshala", "naukri", "linkedin", "ncs", "unstop", "wellfound", "aicte"]
    if any(src in source.lower() for src in trusted_sources):
        score = max(0, score - 15)  # Trusted source = lower risk
        if score < 30:
            reasons = []  # Clear reasons if score is now safe

    # --- CHECK 9: Government portal = very safe ---
    if any(gov in source.lower() for gov in ["ncs", "aicte", "niti", "pmkvy", "startup india", "aseem"]):
        score = max(0, score - 25)
        reasons = []

    # --- CHECK 10: Legit company indicators ---
    for indicator in LEGIT_INDICATORS:
        if indicator in text:
            score = max(0, score - 10)
            break

    return min(score, 100), reasons


def is_safe_to_apply(risk_score: int, threshold: int = 40) -> bool:
    """Returns True if job is safe to auto-apply"""
    return risk_score <= threshold
