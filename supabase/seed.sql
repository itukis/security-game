insert into public.problems (id, title, vulnerability, base_score) values
('sqli-login','SQL Injection in Login Form','sqli',100),
('xss-comments','Cross-Site Scripting in Comment Board','xss',100),
('idor-profile','Insecure Direct Object Reference in Profile API','auth-bypass',100)
on conflict (id) do nothing;