package challenges

import "testing"

func TestParticipantStatusConstants(t *testing.T) {
	if PartConfirmed == PartInvited {
		t.Fatal("status constants collided")
	}
}
