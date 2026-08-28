# Security Specification - Gerenciador de Arquivos

## Data Invariants
1. A property `isForeigner` must exist for every visitor.
2. If `isForeigner` is false, `cpf` must be present and valid.
3. If `isForeigner` is true, `passport` must be present.
4. `gender` must be one of: 'masculino', 'feminino', 'Masculino', 'Feminino'.
5. Visitors can only be created by signed-in staff/admin.
6. A visit record must refer to an existing visitor.

## The "Dirty Dozen" Payloads (Red Team Test Cases)
1. **Identity Spoofing**: Attempt to create a visitor with a fake `ownerId` or system field.
2. **Missing Field**: Create visitor without `fullName`.
3. **Invalid ID**: Document ID with 2KB of random characters.
4. **Invalid Gender**: `gender: 'alien'`.
5. **ID Poisoning**: `cpf: '12345678901234567890...'` (oversized).
6. **Orphaned Visit**: Create a visit for a `visitorId` that does not exist.
7. **Privilege Escalation**: Non-signed-in user trying to list all visitors.
8. **Shadow Update**: Adding `isVerified: true` to a visitor document after creation.
9. **Timestamp Spoofing**: Creating a record with a backdated `createdAt`.
10. **Locker Theft**: Attempt to occupy a locker that is already `OCCUPIED`.
11. **PII Leak**: Unauthorized user trying to `get` a visitor's full profile.
12. **Blanket Query**: Listing all visits without any filters or auth.

## Test Runner
Verified via RLS constraints no PostgreSQL e Edge Functions (Supabase). Testes de integração (Dirty Dozen) foram validados com sucesso.
