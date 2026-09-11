ALTER TABLE audit_logs
ADD COLUMN requestId VARCHAR(100);

CREATE INDEX audit_logs_requestId_idx ON audit_logs(requestId);
