package challenges

import "testing"

func TestCanTransition(t *testing.T) {
	cases := []struct {
		from, to string
		ok       bool
	}{
		{StatusDraft, StatusPendingApproval, true},
		{StatusDraft, StatusPublished, true},
		{StatusDraft, StatusCompleted, false},
		{StatusPendingApproval, StatusPublished, true},
		{StatusPublished, StatusInProgress, true},
		{StatusInProgress, StatusCompleted, true},
		{StatusCompleted, StatusDraft, false},
		{StatusCancelled, StatusPublished, false},
	}
	for _, tc := range cases {
		err := CanTransition(tc.from, tc.to)
		if tc.ok && err != nil {
			t.Fatalf("%s -> %s: unexpected error %v", tc.from, tc.to, err)
		}
		if !tc.ok && err == nil {
			t.Fatalf("%s -> %s: expected error", tc.from, tc.to)
		}
	}
}
