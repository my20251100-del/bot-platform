# Midterm Practical Lab — Cryptographic Investigation

**Analyst:** مصطفى كمال الفقيه  
**Student ID:** 2024010345  
**Issue Date:** 2026-08-12  

---

## Scenario & Intelligence Brief

You are acting as a Cryptanalyst investigating an adversary communication network. Five intercepted transmissions and one suspicious image artifact have been recovered from a compromised relay.

The recovered transmissions are **chained**: the plaintext recovered from each case contains critical intelligence and parameters needed to unlock the subsequent layer.

### Transmission Observations
The adversary utilized layered cryptographic algorithms alongside custom data formatting, transport noise, and structural obfuscation to disguise message statistics. You must carefully inspect the raw transmission formats, clean any transport irregularities, identify the underlying cipher families, and recover the keys and plaintexts.

---

## Intercept Dossier

| File | Description |
|---|---|
| `case_01.txt` | Intercepted Transmission 01 |
| `case_02.txt` | Intercepted Transmission 02 |
| `case_03.txt` | Intercepted Transmission 03 |
| `case_04.txt` | Intercepted Transmission 04 |
| `case_05.txt` | Intercepted Transmission 05 |
| `evidence.png` | Recovered Image Artifact |

---

## Investigation Workflow

1. **Case 01:** Inspect the transmission structure. Clean any transport anomalies, identify the cipher family, and recover the key and the embedded parameter for Case 02.
2. **Case 02:** Use the parameter from Case 01 to assist decryption. Inspect the stream for transport noise and recover the parameters for Case 03.
3. **Case 03:** Decrypt using the parameters from Case 02. Note your student-specific **Operation Code** embedded in the plaintext and recover the metric for Case 04.
4. **Case 04:** Convert the numerical representation into characters, perform polyalphabetic frequency analysis, and recover the keyword phrase for Case 05.
5. **Case 05:** Decode the binary representation to text, decrypt using the keyword phrase, and follow the instructions to proceed to the image analysis.
6. **Steganography Analysis:** Inspect `evidence.png`. Extract the bit-level hidden payload to recover your **Final Verification Token**.

---

## Deliverables & Submission Guidelines

Submit a single archive named `MIDTERM_2024010345.zip` containing:

```text
MIDTERM_2024010345/
├── report.pdf             (Final comprehensive PDF report with screenshots)
├── code/
│   ├── case_01.py         (Clean, documented Python analysis code for each case)
│   ├── case_02.py
│   ├── case_03.py
│   ├── case_04.py
│   ├── case_05.py
│   └── stego_extract.py   (Bit extraction code for evidence.png)
└── evidence/
    └── (Screenshots, frequency distribution plots, and terminal logs)
```

---

## Report Requirements (PDF)

Your submitted **PDF Report** must include screenshots and detailed step-by-step documentation:
1. **Mathematical Derivations & Code Execution:** Show terminal outputs with your code recovering each key.
2. **Hypothesis Testing:** For each case, state at least one failed hypothesis and why it was rejected.
3. **Operation Code & Plaintexts:** Document your recovered plaintexts, keys, and your student Operation Code.
4. **Steganography Methodology:** Bit-level diagram and screenshot of your payload extraction script.

---

## Concept Questions (To Answer in Report)

### Q1. Key Space Analysis
- Calculate the exact key space for Caesar, Multiplicative, Affine, Vigenere (length $L$), and Autokey.
- Explain why key space magnitude alone is insufficient for modern computational security.

### Q2. Modular Arithmetic Requirements
- Explain why $\gcd(a, 26) = 1$ is mandatory in modular multiplication. What happens mathematically when $\gcd(a, 26) \neq 1$? Provide a numerical counterexample.
- Calculate the modular multiplicative inverse of one key you recovered, showing the Extended Euclidean step-by-step.

### Q3. Polyalphabetic & Stream Properties
- Detail the Kasiski Examination procedure. Why does standard Vigenere produce repetitive patterns while Autokey mitigates them?
- What are the mathematical limitations of Autokey against known-plaintext attacks?

### Q4. Diffusion & Confusion Evaluation
- Take the recovered plaintext of Case 01 or 02. Modify a single character and re-encrypt with your key.
- Measure the percentage of changed ciphertext characters. What does this demonstrate regarding the Diffusion property in classical ciphers?

---

## Oral Defense Preparation
You must be ready to explain and reproduce your work during the live examination:
- How you reversed the block scramble and detected noise frequencies.
- How you computed modular inverses and resolved cipher systems.
- How the LSB 32-bit header was parsed to terminate bit extraction.
