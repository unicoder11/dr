package auth

import "testing"

func TestHashAndCheckPassword(t *testing.T) {
	hash, err := HashPassword("secret-pass-123")
	if err != nil {
		t.Fatal(err)
	}
	if !CheckPassword(hash, "secret-pass-123") {
		t.Fatal("expected password to match")
	}
	if CheckPassword(hash, "wrong") {
		t.Fatal("expected mismatch")
	}
}

func TestHasRole(t *testing.T) {
	roles := []string{RoleParticipant, RoleCreator}
	if !HasRole(roles, RoleCreator) {
		t.Fatal("expected creator")
	}
	if HasRole(roles, RoleAdmin) {
		t.Fatal("did not expect admin")
	}
}
