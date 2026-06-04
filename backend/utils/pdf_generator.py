import io
import re
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.lib import colors

def clean_xml_substitutions(text: str) -> str:
    """Escape XML characters to avoid ReportLab formatting exceptions"""
    text = text.replace("&", "&amp;")
    text = text.replace("<", "&lt;")
    text = text.replace(">", "&gt;")
    # Replace markdown bold syntax (**bold**) with HTML bold tags (<b>bold</b>)
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
    # Replace markdown italics (*italic*) with HTML italic tags (<i>italic</i>)
    text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', text)
    return text

def convert_resume_text_to_pdf(resume_text: str) -> bytes:
    """
    Parses plain text resume and outputs an ATS-friendly single-column PDF.
    Recognizes headers, content blocks, and bullet lists.
    """
    buffer = io.BytesIO()
    
    # Page settings: 0.5 inch margins are standard for maximum ATS space compliance
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles definitions for ATS compatibility
    title_style = ParagraphStyle(
        'ResumeTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#0f172a'), # Slate 900
        spaceAfter=4
    )
    
    contact_style = ParagraphStyle(
        'ResumeContact',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#475569'), # Slate 600
        spaceAfter=10
    )
    
    header_style = ParagraphStyle(
        'ResumeHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#1e3a8a'), # Dark Indigo
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'ResumeBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        alignment=TA_LEFT,
        textColor=colors.HexColor('#334155'), # Slate 700
        spaceAfter=4
    )
    
    bullet_style = ParagraphStyle(
        'ResumeBullet',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=3
    )

    story = []
    
    # Split text into lines
    lines = resume_text.splitlines()
    i = 0
    total_lines = len(lines)
    
    # Track states
    is_header_parsed = False
    
    while i < total_lines:
        line = lines[i].strip()
        
        # Skip empty lines
        if not line:
            i += 1
            continue
        
        # 1. Parse Name/Contact info at the very beginning (typically first 2-4 lines)
        if not is_header_parsed and i < 4:
            # Check if it looks like a name (usually capital letters, short)
            if i == 0 or (len(line) < 40 and not any(c in line for c in ["@", "|", "/", "www.", "+91"])):
                story.append(Paragraph(clean_xml_substitutions(line), title_style))
            else:
                story.append(Paragraph(clean_xml_substitutions(line), contact_style))
                is_header_parsed = True
            i += 1
            continue
        
        is_header_parsed = True  # Move past initial contact section
        
        # 2. Detect Main Section Headers (uppercase, reasonably short lines)
        # E.g. "EDUCATION", "WORK EXPERIENCE", "SKILLS", "PROJECTS"
        is_upper_header = line.isupper() and len(line) < 40 and not line.startswith(("-", "•", "*"))
        if is_upper_header:
            story.append(Spacer(1, 4))
            story.append(Paragraph(clean_xml_substitutions(line), header_style))
            i += 1
            continue
            
        # 3. Detect Bullet points
        # Lines starting with •, -, *, or numbered items like "1."
        if line.startswith(("•", "-", "*", "o ")) or re.match(r'^\d+[\.\)]\s+', line):
            # Clean list tags
            cleaned_bullet = re.sub(r'^([•\-\*o]\s*|\d+[\.\)]\s*)', '', line).strip()
            bullet_html = f"&bull; {clean_xml_substitutions(cleaned_bullet)}"
            story.append(Paragraph(bullet_html, bullet_style))
            i += 1
            continue
            
        # 4. Standard Paragraphs (everything else)
        story.append(Paragraph(clean_xml_substitutions(line), body_style))
        i += 1

    # Build the document
    try:
        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes
    except Exception as e:
        buffer.close()
        raise ValueError(f"Failed to compile PDF layout: {e}")
