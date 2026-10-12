/**
 * FROZEN TEXTS: the exact wording of every earlier version of the signed documents.
 * ═══════════════════════════════════════════════════════════════════════════════
 * A signed record stores the version of each document it was signed under. When the
 * app builds a PDF for an old record it must print THAT wording, not today's.
 * Never edit this file. When a text changes, bump its version and add the old text here
 * (the build script that produced this file reads the current text before it is edited).
 *
 * Notes
 *  - Terms: only 4.0-draft is kept as data. Terms 2.0-draft and 3.0-draft records are
 *    printed by the older owner print in App.tsx, which has its own fixed wording.
 *  - Privacy 1.0-draft: the label was used for three different wordings before it was
 *    bumped (commits 23f6454, df7db25, a43f089). The text kept here is the last of them.
 *  - Wording is frozen as it was, including the old company name and the old photo line
 *    that said "your child's place" in the adult version.
 */

/* eslint-disable */
export const FROZEN_TEXTS: any = {
  "terms": {
    "4.0-draft": {
      "minor": {
        "intro": "I, {parent}, am the parent or legal guardian of {child}. I confirm that, as far as I know, my child is physically, medically and mentally fit to join JFLIPS TUMBLING (JFLIPS) and take part in tumbling. I have read the risks and the terms below.",
        "sections": [
          {
            "heading": "Health and emergency treatment",
            "paragraphs": [
              "We will always try to reach you first. If there is an emergency and we cannot reach you or your emergency contact in time, I allow JFLIPS or its coaches to give basic first aid and to arrange emergency medical help for my child. That can include calling an ambulance or taking my child to a doctor or hospital. I understand that coaches are not medical professionals, and I accept responsibility for the cost of the treatment.",
              "JFLIPS gives basic first aid where possible and calls for help when it is needed. Classes take place at a school where staff with first aid training may be on site, but JFLIPS cannot promise that they will be available."
            ],
            "number": 1
          },
          {
            "heading": "Risks",
            "paragraphs": [
              "Tumbling and stunting are physical sports. Even with good coaching and safe equipment, things can go wrong. The main risks are:"
            ],
            "items": [
              "falls and awkward or uncontrolled landings",
              "flips, jumps, rolls and balancing skills going wrong",
              "bumping into other children, or into equipment and mats",
              "strains, sprains, broken bones and dislocated joints",
              "head, neck and back injuries, which can be serious and, in rare cases, permanent",
              "injuries while a coach is helping or spotting a skill",
              "uneven ground, heat, cold or wet surfaces, because some classes are outdoors"
            ],
            "outro": "Most injuries are minor, like bruises and scrapes. Serious injuries can still happen when the coaches and the children do everything right.",
            "number": 2
          },
          {
            "heading": "Responsibility",
            "paragraphs": [
              "I accept these risks on my child's behalf. I agree that JFLIPS TUMBLING (JFLIPS), its owner and its coaches will not be held responsible for any injury, loss or damage that happens in the normal course of classes, except where it is caused by their gross negligence or a deliberate act. I will make sure my child follows the coaches' instructions and the class rules."
            ],
            "number": 3
          },
          {
            "heading": "Coaches' decisions",
            "paragraphs": [
              "The coach decides which skills my child may attempt and may stop any activity they consider unsafe. My child will not attempt skills the coach has not approved. If my child will not follow safety instructions, the coach may stop them taking part for the rest of the class."
            ],
            "number": 4
          },
          {
            "heading": "Belongings",
            "paragraphs": [
              "I understand that JFLIPS TUMBLING (JFLIPS), its owner and its coaches are not responsible for the loss, theft or damage of any belongings my child brings to classes."
            ],
            "number": 5
          },
          {
            "heading": "Keeping health information up to date",
            "paragraphs": [
              "I have given accurate health information on this form. I will tell JFLIPS as soon as I can if my child's health changes, or if they have a new injury or illness."
            ],
            "number": 6
          }
        ]
      },
      "adult": {
        "intro": "I, {name}, confirm that, as far as I know, I am physically, medically and mentally fit to join JFLIPS TUMBLING (JFLIPS) and take part in tumbling. I have read the risks and the terms below.",
        "sections": [
          {
            "heading": "Health and emergency treatment",
            "paragraphs": [
              "We will always try to reach you first. If there is an emergency and we cannot reach you or your emergency contact in time, I allow JFLIPS or its coaches to give basic first aid and to arrange emergency medical help for me. That can include calling an ambulance or taking me to a doctor or hospital. I understand that coaches are not medical professionals, and I accept responsibility for the cost of the treatment.",
              "JFLIPS gives basic first aid where possible and calls for help when it is needed. Classes take place at a school where staff with first aid training may be on site, but JFLIPS cannot promise that they will be available."
            ],
            "number": 1
          },
          {
            "heading": "Risks",
            "paragraphs": [
              "Tumbling and stunting are physical sports. Even with good coaching and safe equipment, things can go wrong. The main risks are:"
            ],
            "items": [
              "falls and awkward or uncontrolled landings",
              "flips, jumps, rolls and balancing skills going wrong",
              "bumping into other participants, or into equipment and mats",
              "strains, sprains, broken bones and dislocated joints",
              "head, neck and back injuries, which can be serious and, in rare cases, permanent",
              "injuries while a coach is helping or spotting you",
              "uneven ground, heat, cold or wet surfaces, because some classes are outdoors"
            ],
            "outro": "Most injuries are minor, like bruises and scrapes. Serious injuries can still happen when the coaches and I do everything right.",
            "number": 2
          },
          {
            "heading": "Responsibility",
            "paragraphs": [
              "I accept these risks. I agree that JFLIPS TUMBLING (JFLIPS), its owner and its coaches will not be held responsible for any injury, loss or damage that happens in the normal course of classes, except where it is caused by their gross negligence or a deliberate act. I will follow the coaches' instructions and the class rules."
            ],
            "number": 3
          },
          {
            "heading": "Coaches' decisions",
            "paragraphs": [
              "The coach decides which skills I may attempt and may stop any activity they consider unsafe. I will not attempt skills the coach has not approved. If I will not follow safety instructions, the coach may stop me taking part for the rest of the class."
            ],
            "number": 4
          },
          {
            "heading": "Belongings",
            "paragraphs": [
              "I understand that JFLIPS TUMBLING (JFLIPS), its owner and its coaches are not responsible for the loss, theft or damage of any belongings I bring to classes."
            ],
            "number": 5
          },
          {
            "heading": "Keeping health information up to date",
            "paragraphs": [
              "I have given accurate health information on this form. I will tell JFLIPS as soon as I can if my health changes, or if I have a new injury or illness."
            ],
            "number": 6
          }
        ]
      }
    }
  },
  "privacy": {
    "1.3-draft": {
      "minor": {
        "title": "Privacy notice and consent",
        "subtitle": "In terms of the Protection of Personal Information Act (POPIA)",
        "intro": "JFlips is the responsible party for your family's personal information. This notice tells you what we collect, why we collect it, who can see it, where it is kept and what your rights are. Please read it and confirm below.",
        "sections": [
          {
            "heading": "Who is responsible for your information",
            "items": [
              "JFlips (Jeandre Blacquiere). Our Information Officer is Jeandre Blacquiere. You can reach us on WhatsApp 069 040 3387 or at jflipsinc@gmail.com."
            ]
          },
          {
            "heading": "What we collect",
            "items": [
              "About your child: name, date of birth and age, class or team, attendance, and any medical conditions, injuries or allergies you tell us about. For children aged 2 to 4: who will stay at the venue and who may collect them.",
              "About you: name, relationship to the child, cell number, email address and your signature. Also the name and number of your emergency contact.",
              "Billing: invoices, the amounts owed and whether they have been paid. Payments are made by EFT, so we do not hold card details.",
              "A record of what you agreed to: which version of each form you saw, and the date and time you signed."
            ]
          },
          {
            "heading": "Is giving us your information voluntary?",
            "items": [
              "Yes. But we cannot enrol your child without your details, an emergency contact and your child's health information, because we need them to keep your child safe. Photo and video consent is a separate choice and is always optional."
            ]
          },
          {
            "heading": "Why we collect it",
            "items": [
              "To register your child and run classes, teams and practices safely.",
              "To contact you about classes, schedules, emergencies and payments.",
              "To invoice you and record payments.",
              "To keep the records the law requires, such as financial records, and to protect ourselves if a claim is made.",
              "Your child's medical information is special personal information. We use it only to keep your child safe and to tell a doctor or medical helper what they need to know in an emergency."
            ]
          },
          {
            "heading": "Who can see it",
            "items": [
              "JFlips management can see all of it.",
              "Your child's coaches can see your child's name, age, medical information and your contact numbers, so they can keep your child safe and reach you in an emergency. They cannot see your signature, email address or billing details.",
              "The companies that run the services we use to store and send information for us (see below). They may only use it for that.",
              "We do not sell your information. We do not share it with anyone else unless the law requires it or a doctor or medical helper needs it in an emergency."
            ]
          },
          {
            "heading": "Where it is kept",
            "items": [
              "Your information is stored in an online database run by Supabase. Our app and website are hosted by Vercel. We use Google Firebase to send alerts to our coaches' phones and Resend to send emails. Some of these companies are outside South Africa, so your information is sent to other countries. We only use them to run JFlips, and only people with their own login can open the information."
            ]
          },
          {
            "heading": "How long we keep it",
            "items": [
              "We keep your information while your child is enrolled. After they leave, we delete what we no longer need. We keep some records for longer, because the law requires it or because a claim could still be made: financial records, signed forms like this one, and incident or injury records. You can ask us how long we keep any record."
            ]
          },
          {
            "heading": "Your rights",
            "items": [
              "You can ask what information we hold about you and your child, and ask for it to be corrected or deleted.",
              "You can object to how we use your information, or withdraw this consent, at any time by contacting us. We must keep some records by law, and without safety and contact details we may not be able to keep your child enrolled.",
              "If you feel your information has been mishandled, you can lodge a complaint with the Information Regulator: POPIAComplaints@inforegulator.org.za."
            ]
          }
        ],
        "agreeLabel": "I have read and understood this privacy notice, and I agree to it.",
        "declarationHeading": "Declaration and signature",
        "declaration": "I declare that I am the parent or legal guardian of the child or children listed and am competent to give consent on their behalf. I consent to JFlips processing my personal information and my child's personal information, including my child's medical information, as described in this notice.",
        "contact": "Questions, or want to change your choices? Contact Jeandre Blacquiere on WhatsApp 069 040 3387 or jflipsinc@gmail.com."
      },
      "adult": {
        "title": "Privacy notice and consent",
        "subtitle": "In terms of the Protection of Personal Information Act (POPIA)",
        "intro": "JFlips is the responsible party for your family's personal information. This notice tells you what we collect, why we collect it, who can see it, where it is kept and what your rights are. Please read it and confirm below.",
        "sections": [
          {
            "heading": "Who is responsible for your information",
            "items": [
              "JFlips (Jeandre Blacquiere). Our Information Officer is Jeandre Blacquiere. You can reach us on WhatsApp 069 040 3387 or at jflipsinc@gmail.com."
            ]
          },
          {
            "heading": "What we collect",
            "items": [
              "About you: name, date of birth and age, class or team, attendance, and any medical conditions, injuries or allergies you tell us about.",
              "Contact details: your cell number, email address and signature, and the name and number of your emergency contact.",
              "Billing: invoices, the amounts owed and whether they have been paid. Payments are made by EFT, so we do not hold card details.",
              "A record of what you agreed to: which version of each form you saw, and the date and time you signed."
            ]
          },
          {
            "heading": "Is giving us your information voluntary?",
            "items": [
              "Yes. But we cannot enrol you without your details, an emergency contact and your health information, because we need them to keep you safe. Photo and video consent is a separate choice and is always optional."
            ]
          },
          {
            "heading": "Why we collect it",
            "items": [
              "To enrol you and run classes, teams and practices safely.",
              "To contact you about classes, schedules, emergencies and payments.",
              "To invoice you and record payments.",
              "To keep the records the law requires, such as financial records, and to protect ourselves if a claim is made.",
              "Your medical information is special personal information. We use it only to keep you safe and to tell a doctor or medical helper what they need to know in an emergency."
            ]
          },
          {
            "heading": "Who can see it",
            "items": [
              "JFlips management can see all of it.",
              "Your coaches can see your name, age, medical information and cell number, so they can keep you safe and reach you in an emergency. They cannot see your signature, email address or billing details.",
              "The companies that run the services we use to store and send information for us (see below). They may only use it for that.",
              "We do not sell your information. We do not share it with anyone else unless the law requires it or a doctor or medical helper needs it in an emergency."
            ]
          },
          {
            "heading": "Where it is kept",
            "items": [
              "Your information is stored in an online database run by Supabase. Our app and website are hosted by Vercel. We use Google Firebase to send alerts to our coaches' phones and Resend to send emails. Some of these companies are outside South Africa, so your information is sent to other countries. We only use them to run JFlips, and only people with their own login can open the information."
            ]
          },
          {
            "heading": "How long we keep it",
            "items": [
              "We keep your information while you are enrolled. After you leave, we delete what we no longer need. We keep some records for longer, because the law requires it or because a claim could still be made: financial records, signed forms like this one, and incident or injury records. You can ask us how long we keep any record."
            ]
          },
          {
            "heading": "Your rights",
            "items": [
              "You can ask what information we hold about you, and ask for it to be corrected or deleted.",
              "You can object to how we use your information, or withdraw this consent, at any time by contacting us. We must keep some records by law, and without safety and contact details we may not be able to keep you enrolled.",
              "If you feel your information has been mishandled, you can lodge a complaint with the Information Regulator: POPIAComplaints@inforegulator.org.za."
            ]
          }
        ],
        "agreeLabel": "I have read and understood this privacy notice, and I agree to it.",
        "declarationHeading": "Declaration and signature",
        "declaration": "I declare that I am 18 years or older and am competent to give consent for myself. I consent to JFlips processing my personal information, including my medical information, as described in this notice.",
        "contact": "Questions, or want to change your choices? Contact Jeandre Blacquiere on WhatsApp 069 040 3387 or jflipsinc@gmail.com."
      }
    },
    "1.2-draft": {
      "minor": {
        "title": "Privacy notice and consent",
        "subtitle": "In terms of the Protection of Personal Information Act (POPIA)",
        "intro": "JFlips is the responsible party for your family's personal information. This notice explains what we collect, why we collect it, who can see it and what your rights are. Please read it and confirm below.",
        "sections": [
          {
            "heading": "Who is responsible for your information",
            "items": [
              "JFlips (Jeandre Blacquiere). You can contact us on WhatsApp 069 040 3387 or at jflipsinc@gmail.com."
            ]
          },
          {
            "heading": "What we collect",
            "items": [
              "About your child: name, date of birth and age, class or team, attendance, and any medical conditions, injuries or allergies you tell us about.",
              "About you: name, relationship to the child, cell number, email address and your signature.",
              "Billing: invoices, the amounts owed and whether they have been paid."
            ]
          },
          {
            "heading": "Payments",
            "items": [
              "Payments are made by EFT (electronic funds transfer)."
            ]
          },
          {
            "heading": "Is giving us your information voluntary?",
            "items": [
              "Yes, but we need your details, an emergency contact and your child's health information to enrol your child and keep them safe. Without them we cannot enrol your child. Giving us photo and video consent is a separate choice and is always optional."
            ]
          },
          {
            "heading": "Why we collect it",
            "items": [
              "To register your child and run classes, teams and practices safely.",
              "To contact you about classes, schedules, emergencies and payments.",
              "To invoice you and record payments.",
              "To keep the records the law requires, such as financial records.",
              "Your child's medical information is special personal information. We use it only to keep your child safe and to give the right information to a doctor or medical help in an emergency."
            ]
          },
          {
            "heading": "Who can see it",
            "items": [
              "JFlips management. Your child's coaches can see your child's name, age, medical information and your contact numbers, so they can keep your child safe and reach you in an emergency. Your signature, email address and billing details stay with management.",
              "We do not sell your information, and we do not share it with anyone else unless the law requires it or a doctor needs it in an emergency."
            ]
          },
          {
            "heading": "How long we keep it",
            "items": [
              "We will delete all of your and your child's information when your child chooses to leave the club, once you have told us so and all accounts are paid."
            ]
          },
          {
            "heading": "Your rights",
            "items": [
              "You can ask what information we hold about you and your child, and ask for it to be corrected or deleted.",
              "You can object to how we use your information, or withdraw this consent, at any time by contacting us. We must keep some records by law, and without safety and contact details we may not be able to keep your child enrolled.",
              "If you feel your information has been mishandled, you can lodge a complaint with the Information Regulator: POPIAComplaints@inforegulator.org.za."
            ]
          }
        ],
        "agreeLabel": "I have read and understood this privacy notice, and I agree to it.",
        "declarationHeading": "Declaration and signature",
        "declaration": "I declare that I am the parent or legal guardian of the child or children listed and am competent to give consent on their behalf. I consent to JFlips processing my personal information and my child's personal information, including my child's medical information, as described in this notice.",
        "contact": "Questions, or want to change your choices? Contact Jeandre Blacquiere on WhatsApp 069 040 3387 or jflipsinc@gmail.com."
      },
      "adult": {
        "title": "Privacy notice and consent",
        "subtitle": "In terms of the Protection of Personal Information Act (POPIA)",
        "intro": "JFlips is the responsible party for your family's personal information. This notice explains what we collect, why we collect it, who can see it and what your rights are. Please read it and confirm below.",
        "sections": [
          {
            "heading": "Who is responsible for your information",
            "items": [
              "JFlips (Jeandre Blacquiere). You can contact us on WhatsApp 069 040 3387 or at jflipsinc@gmail.com."
            ]
          },
          {
            "heading": "What we collect",
            "items": [
              "About you: name, date of birth and age, class or team, attendance, and any medical conditions, injuries or allergies you tell us about.",
              "Contact details: your cell number, email address and your signature.",
              "Billing: invoices, the amounts owed and whether they have been paid."
            ]
          },
          {
            "heading": "Payments",
            "items": [
              "Payments are made by EFT (electronic funds transfer)."
            ]
          },
          {
            "heading": "Is giving us your information voluntary?",
            "items": [
              "Yes, but we need your details, an emergency contact and your health information to enrol you and keep you safe. Without them we cannot enrol you. Photo and video consent is a separate choice and is always optional."
            ]
          },
          {
            "heading": "Why we collect it",
            "items": [
              "To enrol you and run classes, teams and practices safely.",
              "To contact you about classes, schedules, emergencies and payments.",
              "To invoice you and record payments.",
              "To keep the records the law requires, such as financial records.",
              "Your medical information is special personal information. We use it only to keep you safe and to give the right information to a doctor or medical help in an emergency."
            ]
          },
          {
            "heading": "Who can see it",
            "items": [
              "JFlips management. Your coaches can see your name, age, medical information and your cell number, so they can keep you safe and reach you in an emergency. Your signature, email address and billing details stay with management.",
              "We do not sell your information, and we do not share it with anyone else unless the law requires it or a doctor needs it in an emergency."
            ]
          },
          {
            "heading": "How long we keep it",
            "items": [
              "We will delete all of your information when you choose to leave the club, once you have told us so and all accounts are paid."
            ]
          },
          {
            "heading": "Your rights",
            "items": [
              "You can ask what information we hold about you, and ask for it to be corrected or deleted.",
              "You can object to how we use your information, or withdraw this consent, at any time by contacting us. We must keep some records by law, and without safety and contact details we may not be able to keep you enrolled.",
              "If you feel your information has been mishandled, you can lodge a complaint with the Information Regulator: POPIAComplaints@inforegulator.org.za."
            ]
          }
        ],
        "agreeLabel": "I have read and understood this privacy notice, and I agree to it.",
        "declarationHeading": "Declaration and signature",
        "declaration": "I declare that I am 18 years or older and am competent to give consent for myself. I consent to JFlips processing my personal information, including my medical information, as described in this notice.",
        "contact": "Questions, or want to change your choices? Contact Jeandre Blacquiere on WhatsApp 069 040 3387 or jflipsinc@gmail.com."
      }
    },
    "1.1-draft": {
      "minor": {
        "title": "Privacy notice and consent",
        "subtitle": "In terms of the Protection of Personal Information Act (POPIA)",
        "intro": "JFlips is the responsible party for your family's personal information. This notice explains what we collect, why we collect it, who can see it and what your rights are. Please read it and confirm below.",
        "sections": [
          {
            "heading": "Who is responsible for your information",
            "items": [
              "JFlips (Jeandre Blacquiere). You can contact us on WhatsApp 069 040 3387 or at jflipsinc@gmail.com."
            ]
          },
          {
            "heading": "What we collect",
            "items": [
              "About your child: name, date of birth and age, class or team, attendance, and any medical conditions, injuries or allergies you tell us about.",
              "About you: name, relationship to the child, cell number, email address and your signature.",
              "Billing: invoices, the amounts owed and whether they have been paid. We do not store card details."
            ]
          },
          {
            "heading": "Is giving us your information voluntary?",
            "items": [
              "Yes, but we need your details, an emergency contact and your child's health information to enrol your child and keep them safe. Without them we cannot enrol your child. Giving us photo and video consent is a separate choice and is always optional."
            ]
          },
          {
            "heading": "Why we collect it",
            "items": [
              "To register your child and run classes, teams and practices safely.",
              "To contact you about classes, schedules, emergencies and payments.",
              "To invoice you and record payments.",
              "To keep the records the law requires, such as financial records.",
              "Your child's medical information is special personal information. We use it only to keep your child safe and to give the right information to a doctor or medical help in an emergency."
            ]
          },
          {
            "heading": "Who can see it",
            "items": [
              "JFlips management. Your child's coaches can see your child's name, age, medical information and your contact numbers, so they can keep your child safe and reach you in an emergency. Your signature, email address and billing details stay with management.",
              "We do not sell your information, and we do not share it with anyone else unless the law requires it or a doctor needs it in an emergency."
            ]
          },
          {
            "heading": "How long we keep it",
            "items": [
              "We will delete all of your and your child's information when your child chooses to leave the club, once you have told us so and all accounts are paid."
            ]
          },
          {
            "heading": "Your rights",
            "items": [
              "You can ask what information we hold about you and your child, and ask for it to be corrected or deleted.",
              "You can object to how we use your information, or withdraw this consent, at any time by contacting us. We must keep some records by law, and without safety and contact details we may not be able to keep your child enrolled.",
              "If you feel your information has been mishandled, you can lodge a complaint with the Information Regulator: POPIAComplaints@inforegulator.org.za."
            ]
          }
        ],
        "agreeLabel": "I have read and understood this privacy notice, and I agree to it.",
        "declarationHeading": "Declaration and signature",
        "declaration": "I declare that I am the parent or legal guardian of the child or children listed and am competent to give consent on their behalf. I consent to JFlips processing my personal information and my child's personal information, including my child's medical information, as described in this notice.",
        "contact": "Questions, or want to change your choices? Contact Jeandre Blacquiere on WhatsApp 069 040 3387 or jflipsinc@gmail.com."
      },
      "adult": {
        "title": "Privacy notice and consent",
        "subtitle": "In terms of the Protection of Personal Information Act (POPIA)",
        "intro": "JFlips is the responsible party for your family's personal information. This notice explains what we collect, why we collect it, who can see it and what your rights are. Please read it and confirm below.",
        "sections": [
          {
            "heading": "Who is responsible for your information",
            "items": [
              "JFlips (Jeandre Blacquiere). You can contact us on WhatsApp 069 040 3387 or at jflipsinc@gmail.com."
            ]
          },
          {
            "heading": "What we collect",
            "items": [
              "About you: name, date of birth and age, class or team, attendance, and any medical conditions, injuries or allergies you tell us about.",
              "Contact details: your cell number, email address and your signature.",
              "Billing: invoices, the amounts owed and whether they have been paid. We do not store card details."
            ]
          },
          {
            "heading": "Is giving us your information voluntary?",
            "items": [
              "Yes, but we need your details, an emergency contact and your health information to enrol you and keep you safe. Without them we cannot enrol you. Photo and video consent is a separate choice and is always optional."
            ]
          },
          {
            "heading": "Why we collect it",
            "items": [
              "To enrol you and run classes, teams and practices safely.",
              "To contact you about classes, schedules, emergencies and payments.",
              "To invoice you and record payments.",
              "To keep the records the law requires, such as financial records.",
              "Your medical information is special personal information. We use it only to keep you safe and to give the right information to a doctor or medical help in an emergency."
            ]
          },
          {
            "heading": "Who can see it",
            "items": [
              "JFlips management. Your coaches can see your name, age, medical information and your cell number, so they can keep you safe and reach you in an emergency. Your signature, email address and billing details stay with management.",
              "We do not sell your information, and we do not share it with anyone else unless the law requires it or a doctor needs it in an emergency."
            ]
          },
          {
            "heading": "How long we keep it",
            "items": [
              "We will delete all of your information when you choose to leave the club, once you have told us so and all accounts are paid."
            ]
          },
          {
            "heading": "Your rights",
            "items": [
              "You can ask what information we hold about you, and ask for it to be corrected or deleted.",
              "You can object to how we use your information, or withdraw this consent, at any time by contacting us. We must keep some records by law, and without safety and contact details we may not be able to keep you enrolled.",
              "If you feel your information has been mishandled, you can lodge a complaint with the Information Regulator: POPIAComplaints@inforegulator.org.za."
            ]
          }
        ],
        "agreeLabel": "I have read and understood this privacy notice, and I agree to it.",
        "declarationHeading": "Declaration and signature",
        "declaration": "I declare that I am 18 years or older and am competent to give consent for myself. I consent to JFlips processing my personal information, including my medical information, as described in this notice.",
        "contact": "Questions, or want to change your choices? Contact Jeandre Blacquiere on WhatsApp 069 040 3387 or jflipsinc@gmail.com."
      }
    },
    "1.0-draft": {
      "minor": {
        "title": "Privacy notice and consent",
        "subtitle": "In terms of the Protection of Personal Information Act (POPIA)",
        "intro": "JFlips is the responsible party for your family's personal information. This notice explains what we collect, why we collect it, who can see it and what your rights are. Please read it and confirm below.",
        "sections": [
          {
            "heading": "Who is responsible for your information",
            "items": [
              "JFlips (Jeandre Blacquiere). You can contact us on WhatsApp 069 040 3387 or at jflipsinc@gmail.com."
            ]
          },
          {
            "heading": "What we collect",
            "items": [
              "About your child: name, date of birth and age, class or team, attendance, and any medical conditions, injuries or allergies you tell us about.",
              "About you: name, relationship to the child, cell number, email address and your signature.",
              "Billing: invoices, the amounts owed and whether they have been paid. We do not store card details."
            ]
          },
          {
            "heading": "Is giving us your information voluntary?",
            "items": [
              "Yes, but we need your details, an emergency contact and your child's health information to enrol your child and keep them safe. Without them we cannot enrol your child. Giving us photo and video consent is a separate choice and is always optional."
            ]
          },
          {
            "heading": "Why we collect it",
            "items": [
              "To register your child and run classes, teams and practices safely.",
              "To contact you about classes, schedules, emergencies and payments.",
              "To invoice you and record payments.",
              "To keep the records the law requires, such as financial records.",
              "Your child's medical information is special personal information. We use it only to keep your child safe and to give the right information to a doctor or medical help in an emergency."
            ]
          },
          {
            "heading": "Who can see it",
            "items": [
              "Only JFlips management.",
              "We do not sell your information, and we do not share it with anyone else unless the law requires it or a doctor needs it in an emergency."
            ]
          },
          {
            "heading": "How long we keep it",
            "items": [
              "We will delete all of your and your child's information when your child chooses to leave the club, once you have told us so and all accounts are paid."
            ]
          },
          {
            "heading": "Your rights",
            "items": [
              "You can ask what information we hold about you and your child, and ask for it to be corrected or deleted.",
              "You can object to how we use your information, or withdraw this consent, at any time by contacting us. We must keep some records by law, and without safety and contact details we may not be able to keep your child enrolled.",
              "If you feel your information has been mishandled, you can lodge a complaint with the Information Regulator: POPIAComplaints@inforegulator.org.za."
            ]
          }
        ],
        "agreeLabel": "I have read and understood this privacy notice, and I agree to it.",
        "declarationHeading": "Declaration and signature",
        "declaration": "I declare that I am the parent or legal guardian of the child or children listed and am competent to give consent on their behalf. I consent to JFlips processing my personal information and my child's personal information, including my child's medical information, as described in this notice.",
        "contact": "Questions, or want to change your choices? Contact Jeandre Blacquiere on WhatsApp 069 040 3387 or jflipsinc@gmail.com."
      }
    }
  },
  "media": {
    "1.1-draft": {
      "minor": {
        "title": "Consent form: photos, videos and social media",
        "subtitle": "In terms of the Protection of Personal Information Act (POPIA)",
        "intro": "JFlips sometimes takes photos and videos of children during classes, practices and showcases. We would like to use them to promote the sport and show children's progress. A child's photo or video is personal information, and we may only use it with the prior consent of a parent or legal guardian. Please choose below, for each use, whether you give consent. It is voluntary, and a \"no\" has no effect on your child's place at JFlips.",
        "useHeading": "What are you consenting to?",
        "yes": "Yes",
        "no": "No",
        "uses": {
          "instagramFacebookPhotos": "Photos of my child on JFlips's Instagram and Facebook pages",
          "instagramFacebookVideos": "Videos of my child on JFlips's Instagram and Facebook pages",
          "firstNameOnly": "My child's first name with photos and videos (never their surname)",
          "website": "Photos and videos of my child on JFlips's website (jflips.co.za)",
          "printedMaterial": "Photos and videos of my child in printed material and presentations to schools, such as brochures",
          "internalRecordings": "Recordings of my child during classes for coaching and progress, which are not made public"
        },
        "othersHeading": "Photos taken by other people",
        "others": "At competitions and showcases, organisers, other clubs and spectators may take photos and videos. We cannot control what they do with them. If you do not want your child photographed at an event, tell the coach before the event.",
        "promiseHeading": "Our promise",
        "promises": [
          "We only use photos and videos to promote JFlips and the sport and to show children's progress.",
          "We do not name a child's surname, address or school with photos and videos, and we do not tag children on social media.",
          "We only share appropriate and respectful photos and videos.",
          "We do not sell photos or videos or give them to third parties for their own use.",
          "We store recordings securely and delete them when we no longer need them or when you ask us to."
        ],
        "rightsHeading": "Your rights",
        "rights": [
          "You can change or withdraw your consent at any time by contacting us. We will then remove the photos and videos from JFlips's own pages and website as soon as possible. We cannot control content that others have already saved or shared.",
          "You can ask what information we hold about your child, and ask for it to be corrected or deleted.",
          "We keep this form and your choices as proof of what you agreed, for as long as your child is at JFlips and afterwards for as long as the law requires or a claim could be made.",
          "If you feel your child's personal information has been mishandled, you can lodge a complaint with the Information Regulator: POPIAComplaints@inforegulator.org.za."
        ],
        "declarationHeading": "Declaration and signature",
        "declaration": "I declare that I am the parent or legal guardian of the child named above and am competent to give consent on my child's behalf. I have read and understood this form, and my choices are voluntary.",
        "contact": "Questions, or want to change your choices? Contact Jeandre Blacquiere on WhatsApp 069 040 3387 or jflipsinc@gmail.com.",
        "choiceNote": "Your choice here never affects your child's place at JFlips."
      },
      "adult": {
        "title": "Consent form: photos, videos and social media",
        "subtitle": "In terms of the Protection of Personal Information Act (POPIA)",
        "intro": "JFlips sometimes takes photos and videos during classes, practices and showcases. We would like to use them to promote the sport and show progress. A photo or video of you is personal information, and we may only use it with your consent. Please choose below, for each use, whether you give consent. It is voluntary, and a \"no\" has no effect on your place at JFlips.",
        "useHeading": "What are you consenting to?",
        "yes": "Yes",
        "no": "No",
        "uses": {
          "instagramFacebookPhotos": "Photos of me on JFlips's Instagram and Facebook pages",
          "instagramFacebookVideos": "Videos of me on JFlips's Instagram and Facebook pages",
          "firstNameOnly": "My first name with photos and videos (never my surname)",
          "website": "Photos and videos of me on JFlips's website (jflips.co.za)",
          "printedMaterial": "Photos and videos of me in printed material and presentations to schools, such as brochures",
          "internalRecordings": "Recordings of me during classes for coaching and progress, which are not made public"
        },
        "othersHeading": "Photos taken by other people",
        "others": "At competitions and showcases, organisers, other clubs and spectators may take photos and videos. We cannot control what they do with them. If you do not want to be photographed at an event, tell the coach before the event.",
        "promiseHeading": "Our promise",
        "promises": [
          "We only use photos and videos to promote JFlips and the sport and to show children's progress.",
          "We do not name your surname or address with photos and videos, and we do not tag you on social media.",
          "We only share appropriate and respectful photos and videos.",
          "We do not sell photos or videos or give them to third parties for their own use.",
          "We store recordings securely and delete them when we no longer need them or when you ask us to."
        ],
        "rightsHeading": "Your rights",
        "rights": [
          "You can change or withdraw your consent at any time by contacting us. We will then remove the photos and videos from JFlips's own pages and website as soon as possible. We cannot control content that others have already saved or shared.",
          "You can ask what information we hold about you, and ask for it to be corrected or deleted.",
          "We keep this form and your choices as proof of what you agreed, for as long as you are at JFlips and afterwards for as long as the law requires or a claim could be made.",
          "If you feel your personal information has been mishandled, you can lodge a complaint with the Information Regulator: POPIAComplaints@inforegulator.org.za."
        ],
        "declarationHeading": "Declaration and signature",
        "declaration": "I declare that I am 18 years or older and am competent to give this consent for myself. I have read and understood this form, and my choices are voluntary.",
        "contact": "Questions, or want to change your choices? Contact Jeandre Blacquiere on WhatsApp 069 040 3387 or jflipsinc@gmail.com.",
        "choiceNote": "Your choice here never affects your child's place at JFlips."
      }
    },
    "1.0": {
      "minor": {
        "title": "Consent form: photos, videos and social media",
        "subtitle": "In terms of the Protection of Personal Information Act (POPIA)",
        "intro": "JFlips sometimes takes photos and videos of children during classes, practices and showcases. We would like to use them to promote the sport and show children's progress. A child's photo or video is personal information, and we may only use it with the prior consent of a parent or legal guardian. Please choose below, for each use, whether you give consent. It is voluntary, and a \"no\" has no effect on your child's place at JFlips.",
        "useHeading": "What are you consenting to?",
        "yes": "Yes",
        "no": "No",
        "uses": {
          "instagramFacebookPhotos": "Photos of my child on JFlips's Instagram and Facebook pages",
          "instagramFacebookVideos": "Videos of my child on JFlips's Instagram and Facebook pages",
          "firstNameOnly": "My child's first name with photos and videos (never their surname)",
          "website": "Photos and videos of my child on JFlips's website (jflips.co.za)",
          "printedMaterial": "Photos and videos of my child in printed material and presentations to schools, such as brochures",
          "internalRecordings": "Recordings of my child during classes for coaching and progress, which are not made public"
        },
        "promiseHeading": "Our promise",
        "promises": [
          "We only use photos and videos to promote JFlips and the sport and to show children's progress.",
          "We do not name a child's surname, address or school with photos and videos, and we do not tag children on social media.",
          "We only share appropriate and respectful photos and videos.",
          "We do not sell photos or videos or give them to third parties for their own use.",
          "We store recordings securely and delete them when we no longer need them or when you ask us to."
        ],
        "rightsHeading": "Your rights",
        "rights": [
          "You can change or withdraw your consent at any time by contacting us. We will then remove the photos and videos from JFlips's own pages and website as soon as possible. We cannot control content that others have already saved or shared.",
          "You can ask what information we hold about your child, and ask for it to be corrected or deleted.",
          "This form and your choices are kept for as long as your child is at JFlips, and after that only for as long as necessary.",
          "If you feel your child's personal information has been mishandled, you can lodge a complaint with the Information Regulator: POPIAComplaints@inforegulator.org.za."
        ],
        "declarationHeading": "Declaration and signature",
        "declaration": "I declare that I am the parent or legal guardian of the child named above and am competent to give consent on my child's behalf. I have read and understood this form, and my choices are voluntary.",
        "contact": "Questions, or want to change your choices? Contact Jeandre Blacquiere on WhatsApp 069 040 3387 or jflipsinc@gmail.com.",
        "choiceNote": "Your choice here never affects your child's place at JFlips."
      },
      "adult": {
        "title": "Consent form: photos, videos and social media",
        "subtitle": "In terms of the Protection of Personal Information Act (POPIA)",
        "intro": "JFlips sometimes takes photos and videos during classes, practices and showcases. We would like to use them to promote the sport and show progress. A photo or video of you is personal information, and we may only use it with your consent. Please choose below, for each use, whether you give consent. It is voluntary, and a \"no\" has no effect on your place at JFlips.",
        "useHeading": "What are you consenting to?",
        "yes": "Yes",
        "no": "No",
        "uses": {
          "instagramFacebookPhotos": "Photos of me on JFlips's Instagram and Facebook pages",
          "instagramFacebookVideos": "Videos of me on JFlips's Instagram and Facebook pages",
          "firstNameOnly": "My first name with photos and videos (never my surname)",
          "website": "Photos and videos of me on JFlips's website (jflips.co.za)",
          "printedMaterial": "Photos and videos of me in printed material and presentations to schools, such as brochures",
          "internalRecordings": "Recordings of me during classes for coaching and progress, which are not made public"
        },
        "promiseHeading": "Our promise",
        "promises": [
          "We only use photos and videos to promote JFlips and the sport and to show children's progress.",
          "We do not name your surname or address with photos and videos, and we do not tag you on social media.",
          "We only share appropriate and respectful photos and videos.",
          "We do not sell photos or videos or give them to third parties for their own use.",
          "We store recordings securely and delete them when we no longer need them or when you ask us to."
        ],
        "rightsHeading": "Your rights",
        "rights": [
          "You can change or withdraw your consent at any time by contacting us. We will then remove the photos and videos from JFlips's own pages and website as soon as possible. We cannot control content that others have already saved or shared.",
          "You can ask what information we hold about you, and ask for it to be corrected or deleted.",
          "This form and your choices are kept for as long as your child is at JFlips, and after that only for as long as necessary.",
          "If you feel your personal information has been mishandled, you can lodge a complaint with the Information Regulator: POPIAComplaints@inforegulator.org.za."
        ],
        "declarationHeading": "Declaration and signature",
        "declaration": "I declare that I am 18 years or older and am competent to give this consent for myself. I have read and understood this form, and my choices are voluntary.",
        "contact": "Questions, or want to change your choices? Contact Jeandre Blacquiere on WhatsApp 069 040 3387 or jflipsinc@gmail.com.",
        "choiceNote": "Your choice here never affects your child's place at JFlips."
      }
    }
  }
};
