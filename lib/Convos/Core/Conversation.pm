package Convos::Core::Conversation;

=head1 NAME

Convos::Core::Conversation - A convos conversation base class

=head1 DESCRIPTION

L<Convos::Core::Conversation> is a base class for
L<Convos::Core::Conversation::Direct> and
L<Convos::Core::Conversation::Room>.

=cut

use Mojo::Base 'Mojo::EventEmitter';

=head1 ATTRIBUTES

=head2 connection

Holds a L<Convos::Core::Connection> object.

=head2 id

  $str = $self->id;

Unique identifier for this conversation.

=head2 name

  $str = $self->name;

The name of this conversation.

=cut

has active => 0;
sub connection { shift->{connection} or die 'connection required in constructor' }
sub id         { shift->{id}         or die 'id required in constructor' }
has name => sub { shift->id };

=head1 METHODS

=head2 log

  $self = $self->log($level => $format, @args);

This method will emit a "log" event:

  $self->emit(log => $level => $message);

=cut

sub log {
  my ($self, $level, $format, @args) = @_;
  my $message = @args ? sprintf $format, map { $_ // '' } @args : $format;

  $self->emit(log => $level => $message);
}

=head2 path

  $str = $self->path;

Returns a path to this object.
Example: "/superman@example.com/IRC/irc.perl.org/#convos".

=cut

sub path { join '/', $_[0]->connection->path, $_[0]->id }

sub TO_JSON {
  my $self = shift;
  return {map { ($_, $self->$_) } qw( id name path )};
}

=head1 COPYRIGHT AND LICENSE

Copyright (C) 2014, Jan Henning Thorsen

This program is free software, you can redistribute it and/or modify it under
the terms of the Artistic License version 2.0.

=head1 AUTHOR

Jan Henning Thorsen - C<jhthorsen@cpan.org>

=cut

1;