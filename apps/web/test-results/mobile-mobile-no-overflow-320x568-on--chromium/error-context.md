# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - heading "Inventory Management System" [level=1] [ref=e4]
    - paragraph [ref=e5]: "Enter your organization's slug to continue:"
    - generic [ref=e6]:
      - generic [ref=e7]:
        - generic [ref=e8]: https://ims.shamankathmandu.com/
        - textbox "Organization slug" [ref=e9]:
          - /placeholder: your-org
      - button "Continue" [ref=e10]:
        - text: Continue
        - img
    - paragraph [ref=e11]:
      - text: You will have received a URL like https://ims.shamankathmandu.com/
      - emphasis [ref=e12]: your-org
      - text: . Enter the part after the slash. If you don't have a link, contact your administrator.
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e18] [cursor=pointer]:
    - img [ref=e19]
```