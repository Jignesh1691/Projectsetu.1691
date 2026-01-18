# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - main [ref=e3]:
      - generic [ref=e5]:
        - generic [ref=e6]:
          - generic [ref=e7]:
            - heading "Welcome back" [level=1] [ref=e10]
            - paragraph [ref=e11]: Login with your credentials
          - generic [ref=e12]:
            - generic [ref=e13]:
              - text: Email Address
              - textbox "Email Address" [ref=e14]:
                - /placeholder: name@company.com
                - text: admin@acme.com
            - generic [ref=e15]:
              - generic [ref=e16]:
                - generic [ref=e17]: Password
                - link "Forgot password?" [ref=e18] [cursor=pointer]:
                  - /url: /forgot-password
              - textbox "Password" [ref=e19]:
                - /placeholder: ••••••••
                - text: Password123!
            - paragraph [ref=e21]: Invalid email or password
            - button "Sign In" [ref=e22] [cursor=pointer]
        - paragraph [ref=e23]:
          - text: Don't have an account?
          - link "Create one" [ref=e24] [cursor=pointer]:
            - /url: /signup
    - region "Notifications (F8)":
      - list
  - alert [ref=e25]
```