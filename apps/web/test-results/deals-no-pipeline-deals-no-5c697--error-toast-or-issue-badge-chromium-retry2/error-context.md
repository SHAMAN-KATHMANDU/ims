# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]: Welcome to Shaman Yaantra ruby
      - generic [ref=e6]: Login
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: Username
        - textbox "Username" [active] [ref=e11]:
          - /placeholder: Enter your username
          - text: admin
      - generic [ref=e12]:
        - generic [ref=e13]: Password
        - generic [ref=e14]:
          - textbox "Password" [ref=e15]:
            - /placeholder: Enter your password
          - button "Show password" [ref=e16]:
            - img
      - button "Login" [ref=e17]
  - generic [ref=e18]:
    - img [ref=e20]
    - button "Open Tanstack query devtools" [ref=e68] [cursor=pointer]:
      - img [ref=e69]
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e122] [cursor=pointer]:
    - img [ref=e123]
  - alert [ref=e126]
```