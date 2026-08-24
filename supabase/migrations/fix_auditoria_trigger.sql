DROP TRIGGER IF EXISTS trigger_log_usuario_changes ON usuarios;
CREATE TRIGGER trigger_log_usuario_changes
AFTER INSERT OR UPDATE OR DELETE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION log_usuario_changes();
