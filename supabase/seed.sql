insert into public.problems (id, title, vulnerability, base_score) values
('sqli-login','SQL Injection in Login Form','sqli',100),
('xss-comments','Cross-Site Scripting in Comment Board','xss',100),
('idor-profile','Insecure Direct Object Reference in Profile API','auth-bypass',100),
('csrf-transfer','Cross-Site Request Forgery in Transfer API','csrf',100),
('hardcoded-secrets','Hardcoded Admin Key Exposed to Browser','hardcoded-secrets',100),
('open-redirect','Open Redirect in Login Success Page','open-redirect',100),
('file-upload','Insecure File Upload','file-upload',100)
on conflict (id) do nothing;
