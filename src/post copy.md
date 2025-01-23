**Hi everyone!**

A couple of days ago, I asked [this question](https://www.reddit.com/r/vscode/comments/1i6kp7c/is_there_a_vs_code_extension_like_limelightvim/) about whether a VS Code extension similar to `limelight.vim` exists. Since the answer seemed to be "no", I decided to try making one myself:

---

### **What is CodeGlow?**
Basically, it just dims inactive parts of your code while keeping your focus area bright like `limelight.vim`, but designed specifically for VS Code with extra features.

---

### **Key Features:**
- **Smart Focus Detection**
   - **Paragraph Mode:** Dims everything except your current block or paragraph.
   - **Symbol Mode:** Highlights active functions or classes using VS Code's language server.
- **Intelligent Scroll Handling**
   - Automatically pauses dimming during fast scrolling.
   - Keeps the view clear when the cursor is out of sight.
   - Smoothly resumes dimming when scrolling stops.
- **Highly Customizable**
   - Adjust dimming levels, scroll sensitivity, and detection modes.

---

### **Try it out:**
- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=wescottsharples.codeglow)
- [GitHub Repo](https://github.com/wescottsharples/vscode-codeglow)

---

### **Quick Notes:**
- The extension activates on startup (*), which may slightly affect VS Code's initial load time.
- For fine-tuning, you can adjust settings like:
   - `scrollVelocityThreshold`: Set how fast you need to scroll to disable dimming temporarily.
   - `scrollDebounceDelay`: Control how quickly dimming resumes after scrolling stops.
   - `dimOpacity`: Customize dim intensity (from 0.0 to 1.0).

---

Thanks for checking it out and please feel free to leave any feedback or suggestions or submit a PR!
