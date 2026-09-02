# Sujets à coller dans le champ « Subject »

Un sujet par template. Le texte s'adapte à la langue du compte
(`user_metadata.lang`), avec repli français.

## Confirm sign up

```
{{ if eq (printf "%v" .Data.lang) "en" }}Confirm your signup — Hybrid{{ else if eq (printf "%v" .Data.lang) "es" }}Confirma tu registro — Hybrid{{ else }}Confirme ton inscription — Hybrid{{ end }}
```

## Reset password

```
{{ if eq (printf "%v" .Data.lang) "en" }}Reset your password — Hybrid{{ else if eq (printf "%v" .Data.lang) "es" }}Restablece tu contraseña — Hybrid{{ else }}Réinitialise ton mot de passe — Hybrid{{ end }}
```

## Magic link or OTP

```
{{ if eq (printf "%v" .Data.lang) "en" }}Your sign-in link — Hybrid{{ else if eq (printf "%v" .Data.lang) "es" }}Tu enlace de acceso — Hybrid{{ else }}Ton lien de connexion — Hybrid{{ end }}
```

## Change email address

```
{{ if eq (printf "%v" .Data.lang) "en" }}Confirm your new address — Hybrid{{ else if eq (printf "%v" .Data.lang) "es" }}Confirma tu nueva dirección — Hybrid{{ else }}Confirme ta nouvelle adresse — Hybrid{{ end }}
```
